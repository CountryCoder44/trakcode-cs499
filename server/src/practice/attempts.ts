import mongoose, { Types } from 'mongoose';
import { PracticeAssignment, IPracticeAssignment } from '../models/PracticeAssignment';
import { PracticeAttempt, IPracticeAttempt } from '../models/PracticeAttempt';
import { PracticeGenerationJob } from '../models/PracticeGenerationJob';
import { AppError, NotFoundError } from '../errors/AppError';
import { NormalizedRequest, PRACTICE_RUNTIME_VERSION, PracticeRequestInput, RequestConflict, normalizePracticeRequest } from './request';
import { defaultFoundationFor } from './foundation';
import { findActiveAttemptFor, findEligibleAssignment, isEligibleFor } from './matching';
import { claimOrJoinJob, expireIfStale, startJob } from './jobs';
import { evaluateCode } from './evaluation';
import { assertCanGeneratePractice } from '../services/usageLimits.service';
import { LIBRARIES, LibraryEntry, libraryEntry } from './library';
import { BASICS_CURRICULUM_VERSION, PracticeLanguage, catalogFor } from './catalog';

// The learner-facing flow: Start (database match first, generation only as a
// fallback), poll a pending job, and the lifecycle of a private attempt.

export type StartIntent = 'auto' | 'new';

export interface StartInput extends PracticeRequestInput {
  /** Client-generated per Start click; repeats (double clicks, retries, refreshes) return the same outcome. */
  requestId: string;
  /** 'auto' offers Resume when the only fit is work already in progress; 'new' skips that and finds or makes new work. */
  intent: StartIntent;
}

export type StartOutcome =
  | { status: 'ready'; attempt: IPracticeAttempt; assignment: IPracticeAssignment }
  | { status: 'pending'; jobId: string }
  | { status: 'conflict'; conflict: RequestConflict }
  | { status: 'previously_started'; assignment: IPracticeAssignment; abandonedAttemptId: string }
  | { status: 'active_exists'; attempt: IPracticeAttempt; assignment: IPracticeAssignment }
  | { status: 'failed'; message: string }
  | { status: 'unavailable'; message: string };

function isDuplicateKey(err: unknown): boolean {
  return (err as { code?: number })?.code === 11000;
}

async function loadAssignment(id: Types.ObjectId | string): Promise<IPracticeAssignment> {
  const a = await PracticeAssignment.findById(id);
  if (!a) throw new NotFoundError('That practice assignment no longer exists.');
  return a;
}

/**
 * Create the learner's attempt on an assignment. Safe to call repeatedly with
 * the same requestId, and never produces two in-progress attempts on one
 * assignment (both enforced by unique indexes, not by a read-then-write).
 */
export async function createAttempt(
  userId: string,
  assignment: IPracticeAssignment,
  opts: { requestId?: string; source: IPracticeAttempt['source']; replay?: boolean }
): Promise<IPracticeAttempt> {
  try {
    const attempt = await PracticeAttempt.create({
      userId,
      assignmentId: assignment._id,
      familyId: assignment.familyId,
      contentVersion: assignment.contentVersion,
      language: assignment.language,
      mode: assignment.mode,
      scope: assignment.scope,
      advancedConceptIds: assignment.advancedConceptIds,
      status: 'in_progress',
      code: assignment.starterCode,
      startRequestId: opts.requestId,
      source: opts.source,
      replay: opts.replay ?? false,
    });
    await PracticeAssignment.updateOne({ _id: assignment._id }, { $inc: { timesAssigned: 1 } });
    return attempt;
  } catch (err) {
    if (!isDuplicateKey(err)) throw err;
    const existing =
      (opts.requestId ? await PracticeAttempt.findOne({ userId, startRequestId: opts.requestId }) : null) ??
      (await PracticeAttempt.findOne({ userId, assignmentId: assignment._id, status: 'in_progress' }));
    if (existing) return existing;
    throw err;
  }
}

async function ready(attempt: IPracticeAttempt): Promise<StartOutcome> {
  return { status: 'ready', attempt, assignment: await loadAssignment(attempt.assignmentId) };
}

export async function startPractice(userId: string, input: StartInput): Promise<StartOutcome> {
  // A repeat of a Start we've already handled.
  const byRequest = await PracticeAttempt.findOne({ userId, startRequestId: input.requestId });
  if (byRequest) return ready(byRequest);
  const waitingJob = await PracticeGenerationJob.findOne({
    waiters: { $elemMatch: { userId: new mongoose.Types.ObjectId(userId), requestId: input.requestId } },
  }).sort({ startedAt: -1 });
  if (waitingJob) return pollJob(userId, waitingJob.id);

  const defaults = await defaultFoundationFor(userId, input.language);
  const normalized = normalizePracticeRequest(input, defaults.foundationIds);
  if (!normalized.ok) return { status: 'conflict', conflict: normalized.conflict };
  const req = normalized.request;

  const match = await findEligibleAssignment(userId, req);
  if (match) {
    if (match.abandonedAttemptId) {
      return { status: 'previously_started', assignment: match.assignment, abandonedAttemptId: match.abandonedAttemptId.toString() };
    }
    return ready(await createAttempt(userId, match.assignment, { requestId: input.requestId, source: 'bank' }));
  }

  // Nothing new in the bank. If the learner already has fitting work open,
  // offer that first; generating needs an explicit "New assignment".
  if (input.intent === 'auto') {
    const active = await findActiveAttemptFor(userId, req);
    if (active) return { status: 'active_exists', attempt: active, assignment: await loadAssignment(active.assignmentId) };
  }

  return requestGeneration(userId, input.requestId, req);
}

async function requestGeneration(userId: string, requestId: string, req: NormalizedRequest): Promise<StartOutcome> {
  // Nothing in the bank fits: a new assignment needs some of this learner's
  // monthly (or trial) allowance. Throws 429 PRACTICE_LIMIT when it's used up.
  await assertCanGeneratePractice(userId);
  const { job, claimed } = await claimOrJoinJob(userId, requestId, req);
  if (claimed) startJob(job.id, userId);
  return { status: 'pending', jobId: job.id };
}

/** Check on a pending generation job; once it's done, hand this learner their attempt. */
export async function pollJob(userId: string, jobId: string): Promise<StartOutcome> {
  if (!mongoose.isValidObjectId(jobId)) throw new NotFoundError('Job not found');
  const uid = new mongoose.Types.ObjectId(userId);
  const found = await PracticeGenerationJob.findOne({ _id: jobId, 'waiters.userId': uid });
  if (!found) throw new NotFoundError('Job not found');
  const job = await expireIfStale(found);

  if (job.status === 'running') return { status: 'pending', jobId: job.id };
  if (job.status === 'failed') {
    return { status: 'failed', message: job.failureMessage ?? "We couldn't prepare that assignment." };
  }

  const waiter = [...job.waiters].reverse().find((w) => w.userId.equals(uid))!;
  if (waiter.requestId) {
    const existing = await PracticeAttempt.findOne({ userId, startRequestId: waiter.requestId });
    if (existing) return ready(existing);
  }
  const assignment = await loadAssignment(job.resultAssignmentId!);
  const req = job.spec as unknown as NormalizedRequest;
  if (await isEligibleFor(userId, req, assignment._id)) {
    const attempt = await createAttempt(userId, assignment, {
      requestId: waiter.requestId,
      source: job.resolvedFromBank ? 'bank' : 'generated',
    });
    return ready(attempt);
  }
  // Already theirs and still open (e.g. started from another tab): hand it back.
  const open = await PracticeAttempt.findOne({ userId, familyId: assignment.familyId, status: 'in_progress' });
  if (open) return ready(open);
  return { status: 'unavailable', message: "That assignment isn't new for you any more. Start again to get another one." };
}

// ---- Attempt lifecycle ----

export async function getOwnAttempt(userId: string, attemptId: string): Promise<IPracticeAttempt> {
  if (!mongoose.isValidObjectId(attemptId)) throw new NotFoundError('Attempt not found');
  const attempt = await PracticeAttempt.findOne({ _id: attemptId, userId });
  if (!attempt) throw new NotFoundError('Attempt not found');
  return attempt;
}

export async function getAttemptWithAssignment(userId: string, attemptId: string) {
  const attempt = await getOwnAttempt(userId, attemptId);
  return { attempt, assignment: await loadAssignment(attempt.assignmentId) };
}

/** Continue a previously abandoned attempt with its saved work. */
export async function reopenAttempt(userId: string, attemptId: string): Promise<IPracticeAttempt> {
  const attempt = await getOwnAttempt(userId, attemptId);
  if (attempt.status === 'in_progress') return attempt;
  if (attempt.status !== 'abandoned') throw new AppError('This assignment is already complete.', 409);
  try {
    attempt.status = 'in_progress';
    attempt.abandonedAt = undefined;
    await attempt.save();
    return attempt;
  } catch (err) {
    if (!isDuplicateKey(err)) throw err;
    return (await PracticeAttempt.findOne({ userId, assignmentId: attempt.assignmentId, status: 'in_progress' }))!;
  }
}

/** Start a previously abandoned assignment over from the starter code (the old attempt stays as it was). */
export async function restartAttempt(userId: string, attemptId: string): Promise<IPracticeAttempt> {
  const old = await getOwnAttempt(userId, attemptId);
  if (old.status === 'completed') throw new AppError('This assignment is already complete. Use "Practice again" to redo it.', 409);
  const assignment = await loadAssignment(old.assignmentId);
  if (old.status === 'in_progress') {
    old.status = 'abandoned';
    old.abandonedAt = new Date();
    await old.save();
  }
  return createAttempt(userId, assignment, { source: 'resume' });
}

export async function abandonAttempt(userId: string, attemptId: string): Promise<IPracticeAttempt> {
  const attempt = await getOwnAttempt(userId, attemptId);
  if (attempt.status !== 'in_progress') return attempt;
  attempt.status = 'abandoned';
  attempt.abandonedAt = new Date();
  await attempt.save();
  return attempt;
}

/** Redo completed work on purpose. Marked as a replay so it never counts as new practice. */
export async function replayAttempt(userId: string, attemptId: string): Promise<IPracticeAttempt> {
  const old = await getOwnAttempt(userId, attemptId);
  if (old.status !== 'completed') throw new AppError('Only completed assignments can be practiced again.', 409);
  return createAttempt(userId, await loadAssignment(old.assignmentId), { source: 'replay', replay: true });
}

export async function saveCode(userId: string, attemptId: string, code: string): Promise<IPracticeAttempt> {
  const attempt = await getOwnAttempt(userId, attemptId);
  if (attempt.status === 'abandoned') throw new AppError('Continue this assignment before saving changes to it.', 409);
  attempt.code = code;
  await attempt.save();
  return attempt;
}

/** Save, run every test, and complete the attempt only when all completion criteria are met. */
export async function runAttempt(userId: string, attemptId: string, code: string): Promise<IPracticeAttempt> {
  const { attempt, assignment } = await getAttemptWithAssignment(userId, attemptId);
  if (attempt.status === 'abandoned') throw new AppError('Continue this assignment before running it.', 409);
  attempt.code = code;
  const run = await evaluateCode(assignment, code);
  attempt.lastRun = run;
  attempt.runCount += 1;
  if (run.completedThisRun && attempt.status === 'in_progress') {
    attempt.status = 'completed';
    attempt.completedAt = new Date();
  }
  await attempt.save();
  return attempt;
}

export async function listAttempts(userId: string, statuses: IPracticeAttempt['status'][]) {
  const attempts = await PracticeAttempt.find({ userId, status: { $in: statuses } }).sort({ updatedAt: -1 }).limit(50);
  const titles = new Map(
    (await PracticeAssignment.find({ _id: { $in: attempts.map((a) => a.assignmentId) } }).select('title').lean()).map((a) => [
      a._id.toString(),
      a.title,
    ])
  );
  return attempts.map((a) => ({ attempt: a, title: titles.get(a.assignmentId.toString()) ?? 'Practice assignment' }));
}

// ---- Practice library (practice/library) ----

export type LibraryStatus = 'not_started' | 'in_progress' | 'completed' | 'abandoned';

export interface LibraryItemView {
  entry: LibraryEntry;
  /** Already built: starting it is instant and free. */
  ready: boolean;
  status: LibraryStatus;
}

/** A language's library, with this learner's progress on each entry. */
export async function libraryForUser(userId: string, language: PracticeLanguage): Promise<LibraryItemView[]> {
  const entries = LIBRARIES[language] ?? [];
  if (!entries.length) return [];
  const built = await PracticeAssignment.find({ libraryId: { $in: entries.map((x) => x.id) }, status: 'published' })
    .select('_id libraryId')
    .lean();
  const assignmentByLibrary = new Map(built.map((a) => [a.libraryId!, a._id.toString()]));
  const attempts = await PracticeAttempt.find({ userId, assignmentId: { $in: built.map((a) => a._id) } })
    .select('assignmentId status')
    .lean();
  const statusByAssignment = new Map<string, LibraryStatus>();
  for (const a of attempts) {
    const key = a.assignmentId.toString();
    const prev = statusByAssignment.get(key);
    // Completed beats in progress beats put down: show the best outcome.
    const rank = (s?: LibraryStatus) => (s === 'completed' ? 3 : s === 'in_progress' ? 2 : s === 'abandoned' ? 1 : 0);
    if (rank(a.status) > rank(prev)) statusByAssignment.set(key, a.status);
  }
  return entries.map((entry) => {
    const assignmentId = assignmentByLibrary.get(entry.id);
    return {
      entry,
      ready: Boolean(assignmentId),
      status: (assignmentId && statusByAssignment.get(assignmentId)) || 'not_started',
    };
  });
}

/**
 * Start a library entry. Once built, it's handed out like any bank assignment
 * (resuming the learner's open attempt, or a fresh try if they finished it).
 * The first start of an unbuilt entry generates it from its brief, which uses
 * one of the learner's new-question allowance like any other generation.
 */
export async function startLibraryEntry(userId: string, libraryId: string, requestId: string): Promise<StartOutcome> {
  const entry = libraryEntry(libraryId);
  if (!entry) throw new NotFoundError('That practice assignment is no longer available.');

  const byRequest = await PracticeAttempt.findOne({ userId, startRequestId: requestId });
  if (byRequest) return ready(byRequest);

  const assignment = await PracticeAssignment.findOne({ libraryId, status: 'published' });
  if (assignment) {
    const mine = await PracticeAttempt.find({ userId, assignmentId: assignment._id }).sort({ updatedAt: -1 });
    const open = mine.find((a) => a.status === 'in_progress');
    if (open) return ready(open);
    const putDown = mine.find((a) => a.status === 'abandoned');
    if (putDown) return ready(await reopenAttempt(userId, putDown.id));
    const done = mine.find((a) => a.status === 'completed');
    if (done) return ready(await replayAttempt(userId, done.id));
    return ready(await createAttempt(userId, assignment, { requestId, source: 'bank' }));
  }

  const req: NormalizedRequest = {
    language: entry.language,
    mode: entry.mode,
    scope: entry.scope,
    conceptCount: entry.concepts.length,
    requiredConceptIds: [...entry.concepts].sort(),
    namedConceptIds: [...entry.concepts],
    permittedFoundationIds: catalogFor(entry.language).foundation.map((f) => f.id),
    basicsVersion: BASICS_CURRICULUM_VERSION,
    runtimeVersion: PRACTICE_RUNTIME_VERSION,
    libraryId,
  };
  return requestGeneration(userId, requestId, req);
}

/**
 * This learner's unfinished work in a language that didn't come from the
 * library (started from the setup card), for the library's "Started, not
 * completed" filter.
 */
export async function unfinishedOutsideLibrary(userId: string, language: PracticeLanguage) {
  const attempts = await PracticeAttempt.find({ userId, language, status: { $in: ['in_progress', 'abandoned'] } })
    .sort({ updatedAt: -1 })
    .limit(50);
  const assignments = await PracticeAssignment.find({ _id: { $in: attempts.map((a) => a.assignmentId) } })
    .select('title libraryId')
    .lean();
  const byId = new Map(assignments.map((a) => [a._id.toString(), a]));
  return attempts
    .filter((a) => !byId.get(a.assignmentId.toString())?.libraryId)
    .map((a) => ({ attempt: a, title: byId.get(a.assignmentId.toString())?.title ?? 'Practice assignment' }));
}
