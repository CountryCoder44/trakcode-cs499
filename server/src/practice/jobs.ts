import os from 'os';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { PracticeGenerationJob, IPracticeGenerationJob, JobFailureCategory } from '../models/PracticeGenerationJob';
import { PracticeAssignment } from '../models/PracticeAssignment';
import { AiUnavailableError } from '../errors/AppError';
import {
  PRACTICE_GENERATION_TIME_BUDGET_MS,
  PRACTICE_GENERATION_TOKEN_BUDGET,
  PRACTICE_JOB_LEASE_MS,
  PRACTICE_MAX_GENERATION_ATTEMPTS,
} from '../config/constants';
import { NormalizedRequest, foundationNeededBy, pickConceptCombination, requestKey } from './request';
import { GenerationSpec } from './draft';
import { findEligibleAssignment } from './matching';
import { practiceDeps } from './deps';
import { ExistingAssignmentSummary, validateDraft } from './validation';
import { scanConcepts } from './staticAnalysis';
import { recordUsage } from '../services/usageLimits.service';
import { libraryEntry } from './library';

// Generation fallback, coordinated so equivalent requests share one job:
//   1. claim (or join) the running job for this request's normalized key,
//   2. re-check the bank now that we hold the claim,
//   3. choose concepts (random or partly specified requests),
//   4. generate → validate → repair, within attempt/token/time budgets,
//   5. publish only a fully validated assignment.
// The job runs in the background; learners poll it (see attempts.ts).

const WORKER_ID = `${os.hostname()}:${process.pid}:${crypto.randomUUID().slice(0, 8)}`;

// In-flight runs, so tests (and graceful shutdown, later) can await them.
const inFlight = new Map<string, Promise<void>>();

export function waitForJob(jobId: string): Promise<void> {
  return inFlight.get(jobId) ?? Promise.resolve();
}

/** Mark a running job whose lease ran out as failed, so it can be retried. */
export async function expireIfStale(job: IPracticeGenerationJob): Promise<IPracticeGenerationJob> {
  if (job.status !== 'running' || job.leaseExpiresAt.getTime() > Date.now()) return job;
  const updated = await PracticeGenerationJob.findOneAndUpdate(
    { _id: job._id, status: 'running', leaseExpiresAt: { $lte: new Date() } },
    {
      $set: {
        status: 'failed',
        failureCategory: 'lease-expired',
        failureMessage: 'Preparing this assignment stopped unexpectedly.',
        finishedAt: new Date(),
      },
    },
    { new: true }
  );
  return updated ?? (await PracticeGenerationJob.findById(job._id))!;
}

/**
 * Join the running job for this request, or claim a new one. Uniqueness is on
 * the running claim (partial unique index), so two simultaneous claims can't
 * both win; the loser joins the winner's job.
 */
export async function claimOrJoinJob(
  userId: string,
  requestId: string,
  req: NormalizedRequest
): Promise<{ job: IPracticeGenerationJob; claimed: boolean }> {
  const key = requestKey(req);
  const waiter = { userId: new mongoose.Types.ObjectId(userId), requestId, joinedAt: new Date() };

  for (let tries = 0; tries < 4; tries++) {
    const running = await PracticeGenerationJob.findOne({ requestKey: key, status: 'running' });
    if (running) {
      const fresh = await expireIfStale(running);
      if (fresh.status !== 'running') continue; // its lease ran out; claim a new one
      const joined = await PracticeGenerationJob.findOneAndUpdate(
        { _id: fresh._id, status: 'running', waiters: { $not: { $elemMatch: { userId: waiter.userId, requestId } } } },
        { $push: { waiters: waiter } },
        { new: true }
      );
      return { job: joined ?? fresh, claimed: false };
    }
    try {
      const job = await PracticeGenerationJob.create({
        requestKey: key,
        spec: req as unknown as Record<string, unknown>,
        status: 'running',
        leaseOwner: WORKER_ID,
        leaseExpiresAt: new Date(Date.now() + PRACTICE_JOB_LEASE_MS),
        waiters: [waiter],
      });
      return { job, claimed: true };
    } catch (err) {
      if ((err as { code?: number }).code !== 11000) throw err;
      // Someone claimed it between our read and write; loop and join theirs.
    }
  }
  throw new Error('Could not claim or join a generation job');
}

/** Start the worker for a job we just claimed. Returns immediately. */
export function startJob(jobId: string, userId: string): void {
  const run = runJob(jobId, userId)
    .catch(async (err) => {
      // eslint-disable-next-line no-console
      console.error('practice generation job crashed', err);
      await finishFailed(jobId, 'error', 'Something went wrong while preparing this assignment.');
    })
    .finally(() => inFlight.delete(jobId));
  inFlight.set(jobId, run);
}

async function renewLease(jobId: string, extra: Record<string, unknown> = {}): Promise<boolean> {
  const res = await PracticeGenerationJob.updateOne(
    { _id: jobId, status: 'running', leaseOwner: WORKER_ID },
    { $set: { leaseExpiresAt: new Date(Date.now() + PRACTICE_JOB_LEASE_MS), ...extra } }
  );
  return res.modifiedCount === 1;
}

async function finishFailed(jobId: string, category: JobFailureCategory, message: string): Promise<void> {
  await PracticeGenerationJob.updateOne(
    { _id: jobId, status: 'running', leaseOwner: WORKER_ID },
    { $set: { status: 'failed', failureCategory: category, failureMessage: message, finishedAt: new Date() } }
  );
}

async function finishSucceeded(jobId: string, assignmentId: mongoose.Types.ObjectId, fromBank: boolean): Promise<void> {
  await PracticeGenerationJob.updateOne(
    { _id: jobId, status: 'running', leaseOwner: WORKER_ID },
    { $set: { status: 'succeeded', resultAssignmentId: assignmentId, resolvedFromBank: fromBank, finishedAt: new Date() } }
  );
}

async function existingSummaries(language: string): Promise<ExistingAssignmentSummary[]> {
  const docs = await PracticeAssignment.find({ language, status: { $in: ['published', 'disabled'] } })
    .select('title fingerprint mode scope advancedConceptIds')
    .sort({ createdAt: -1 })
    .limit(1000)
    .lean();
  return docs.map((d) => ({ title: d.title, fingerprint: d.fingerprint ?? [] }));
}

async function runJob(jobId: string, userId: string): Promise<void> {
  const job = await PracticeGenerationJob.findById(jobId);
  if (!job || job.status !== 'running' || job.leaseOwner !== WORKER_ID) return;
  const req = job.spec as unknown as NormalizedRequest;
  const deadline = job.startedAt.getTime() + PRACTICE_GENERATION_TIME_BUDGET_MS;

  // A practice library entry is built from its own brief, with exactly its
  // concepts, and saved under its id so every later start reuses it.
  const entry = req.libraryId ? libraryEntry(req.libraryId) : undefined;
  if (req.libraryId && !entry) {
    await finishFailed(jobId, 'validation', 'That practice assignment is no longer available.');
    return;
  }

  // Re-check the bank while holding the claim: an equivalent job may have
  // just published something this learner can use.
  if (entry) {
    const built = await PracticeAssignment.findOne({ libraryId: entry.id, status: 'published' }).select('_id');
    if (built) {
      await finishSucceeded(jobId, built._id, true);
      return;
    }
  } else {
    const match = await findEligibleAssignment(userId, req);
    if (match) {
      await finishSucceeded(jobId, match.assignment._id, true);
      return;
    }
  }

  // Concepts are only chosen now, after the bank search came up empty.
  const conceptIds = entry
    ? [...entry.concepts]
    : req.mode === 'basics'
      ? []
      : pickConceptCombination(req.language, req.requiredConceptIds, req.conceptCount, req.permittedFoundationIds);
  if (!conceptIds) {
    await finishFailed(jobId, 'validation', "There's no compatible set of concepts for this request.");
    return;
  }
  if (!(await renewLease(jobId, { chosenConceptIds: conceptIds }))) return;

  const existing = await existingSummaries(req.language);
  const sameConfig = await PracticeAssignment.find({
    language: req.language,
    mode: req.mode,
    scope: req.scope,
    status: 'published',
    advancedConceptIds: { $all: conceptIds, $size: conceptIds.length },
  })
    .select('title')
    .limit(30)
    .lean();
  const spec: GenerationSpec = {
    language: req.language,
    mode: req.mode,
    scope: req.scope,
    conceptIds,
    permittedFoundationIds: req.permittedFoundationIds,
    avoidTitles: entry ? [] : sameConfig.map((d) => d.title),
    ...(entry ? { brief: { title: entry.title, scenario: entry.scenario, requirements: entry.requirements } } : {}),
  };

  const { generator, executor } = practiceDeps();
  let feedback: string[] | null = null;
  let tokens = 0;

  for (let attempt = 1; attempt <= PRACTICE_MAX_GENERATION_ATTEMPTS; attempt++) {
    if (Date.now() > deadline || tokens >= PRACTICE_GENERATION_TOKEN_BUDGET) {
      await finishFailed(jobId, 'budget', 'Preparing this assignment took longer than allowed.');
      return;
    }
    if (!(await renewLease(jobId, { attempts: attempt }))) return;

    let output;
    try {
      output = await generator.generate(spec, feedback, userId);
    } catch (err) {
      if (err instanceof AiUnavailableError) {
        await finishFailed(jobId, 'ai-unavailable', 'New assignments are unavailable right now.');
        return;
      }
      feedback = [`The previous attempt errored: ${err instanceof Error ? err.message : String(err)}`];
      await PracticeGenerationJob.updateOne({ _id: jobId }, { $push: { validationFailures: { attempt, reasons: feedback } } });
      continue;
    }
    tokens += output.tokensUsed;
    if (!(await renewLease(jobId, { tokensUsed: tokens }))) return;

    const result = await validateDraft(output.draft, spec, executor, existing);
    if (!result.ok) {
      feedback = result.reasons;
      await PracticeGenerationJob.updateOne({ _id: jobId }, { $push: { validationFailures: { attempt, reasons: result.reasons } } });
      continue;
    }

    const d = result.draft;
    const scanned = scanConcepts(d.referenceSolution, req.language).foundation;
    const foundation = [...new Set([...d.foundationConceptIds, ...foundationNeededBy(req.language, conceptIds), ...scanned])]
      .filter((id) => req.permittedFoundationIds.includes(id))
      .sort();
    const assignment = await PracticeAssignment.create({
      language: req.language,
      mode: req.mode,
      scope: req.scope,
      foundationConceptIds: foundation,
      advancedConceptIds: [...conceptIds].sort(),
      advancedConceptCount: conceptIds.length,
      basicsVersion: req.basicsVersion,
      runtimeVersion: req.runtimeVersion,
      status: 'published',
      title: d.title,
      scenario: d.scenario,
      goal: d.goal,
      requirements: d.requirements,
      deliverables: d.deliverables,
      inputSpec: d.inputSpec,
      outputSpec: d.outputSpec,
      constraints: d.constraints,
      acceptanceCriteria: d.acceptanceCriteria,
      samples: d.samples,
      starterCode: d.starterCode,
      fixtures: d.fixtures,
      tests: d.tests,
      rubric: result.rubric,
      referenceSolution: d.referenceSolution,
      tutorNotes: d.tutorNotes,
      fingerprint: result.fingerprint,
      source: 'generated',
      generationJobId: job._id,
      publishedAt: new Date(),
      ...(entry ? { libraryId: entry.id } : {}),
    });
    await finishSucceeded(jobId, assignment._id, false);
    // A brand-new assignment: counts toward the learner who asked for it
    // (usageLimits.service.ts). Bank matches above are free.
    await recordUsage(userId, 'practice-generation');
    return;
  }

  await finishFailed(jobId, 'validation', "We couldn't prepare an assignment that met all the checks.");
}
