import mongoose, { Types } from 'mongoose';
import { PracticeAssignment, IPracticeAssignment } from '../models/PracticeAssignment';
import { PracticeAttempt, IPracticeAttempt } from '../models/PracticeAttempt';
import { BASICS_CURRICULUM_VERSION, catalogFor } from './catalog';
import { NormalizedRequest } from './request';
import { BANK_SELECTION_POOL_SIZE } from '../config/constants';

// Database-first selection: structured queries only, never an AI call. Callable
// on its own (no generation, no HTTP) so the rules can be tested directly.
//
// Hard requirements are never relaxed to improve reuse. Per-learner
// exclusions (completed families, work already in progress) are applied
// inside the same aggregation over the whole matching pool, so a page of
// already-completed candidates can't hide a later eligible one.

/** Basics curriculum versions whose assignments are still valid for today's requests. */
export const COMPATIBLE_BASICS_VERSIONS = [BASICS_CURRICULUM_VERSION];

export function eligibilityFilter(req: NormalizedRequest): Record<string, unknown> {
  const catalogIds = catalogFor(req.language).advanced.map((c) => c.id);
  const filter: Record<string, unknown> = {
    language: req.language,
    mode: req.mode,
    scope: req.scope,
    status: 'published',
    basicsVersion: { $in: COMPATIBLE_BASICS_VERSIONS },
    runtimeVersion: req.runtimeVersion,
    // Basics: exactly zero advanced concepts. Stretch: exactly the count asked for.
    advancedConceptCount: req.conceptCount,
    // Every foundation skill it needs is on the learner's list (subset test).
    foundationConceptIds: { $not: { $elemMatch: { $nin: req.permittedFoundationIds } } },
    // Every advanced concept is one this catalog still knows about.
    advancedConceptIds: { $not: { $elemMatch: { $nin: catalogIds } } },
  };
  if (req.requiredConceptIds.length) {
    filter.advancedConceptIds = { ...(filter.advancedConceptIds as object), $all: req.requiredConceptIds };
  }
  return filter;
}

export interface BankMatch {
  assignment: IPracticeAssignment;
  /** Set when the learner started this one before and put it down. */
  abandonedAttemptId?: Types.ObjectId;
}

interface Candidate {
  _id: Types.ObjectId;
  abandonedAttemptId: Types.ObjectId | null;
}

/**
 * Find an eligible assignment for this learner: not completed (any version of
 * the family), not already in progress, preferring ones they've never started,
 * then less-assigned ones, with a random choice among close candidates.
 */
export async function findEligibleAssignment(
  userId: string,
  req: NormalizedRequest,
  opts: { excludeAssignmentIds?: Types.ObjectId[]; rand?: () => number } = {}
): Promise<BankMatch | null> {
  const rand = opts.rand ?? Math.random;
  const match = eligibilityFilter(req);
  if (opts.excludeAssignmentIds?.length) match._id = { $nin: opts.excludeAssignmentIds };
  const uid = new mongoose.Types.ObjectId(userId);

  const pool = await PracticeAssignment.aggregate<Candidate & { abandoned: number }>([
    { $match: match },
    {
      $lookup: {
        from: PracticeAttempt.collection.name,
        let: { fid: '$familyId' },
        pipeline: [
          { $match: { userId: uid, $expr: { $eq: ['$familyId', '$$fid'] } } },
          { $project: { status: 1, updatedAt: 1 } },
        ],
        as: 'mine',
      },
    },
    // Excluded: a completed family, or anything already in progress.
    { $match: { 'mine.status': { $nin: ['completed', 'in_progress'] } } },
    {
      $addFields: {
        abandoned: { $cond: [{ $gt: [{ $size: '$mine' }, 0] }, 1, 0] },
        abandonedAttemptId: { $ifNull: [{ $last: '$mine._id' }, null] },
        r: { $rand: {} },
      },
    },
    { $sort: { abandoned: 1, timesAssigned: 1, r: 1 } },
    { $limit: BANK_SELECTION_POOL_SIZE },
    { $project: { _id: 1, abandoned: 1, abandonedAttemptId: 1 } },
  ]);
  if (pool.length === 0) return null;

  // Never-started items win whenever there are any; vary among them.
  const best = pool.filter((p) => p.abandoned === pool[0].abandoned);
  const picked = best[Math.floor(rand() * best.length)];
  const assignment = await PracticeAssignment.findById(picked._id);
  if (!assignment) return null;
  return { assignment, abandonedAttemptId: picked.abandoned ? picked.abandonedAttemptId ?? undefined : undefined };
}

/** The learner's in-progress attempt that fits this request, if any (for "Resume"). */
export async function findActiveAttemptFor(userId: string, req: NormalizedRequest): Promise<IPracticeAttempt | null> {
  const filter: Record<string, unknown> = {
    userId,
    status: 'in_progress',
    language: req.language,
    mode: req.mode,
    scope: req.scope,
    replay: false,
    advancedConceptIds: { $size: req.conceptCount },
  };
  if (req.requiredConceptIds.length) {
    filter.advancedConceptIds = { $size: req.conceptCount, $all: req.requiredConceptIds };
  }
  return PracticeAttempt.findOne(filter).sort({ updatedAt: -1 });
}

/** Is this assignment (still) fine to give this learner as new practice? */
export async function isEligibleFor(userId: string, req: NormalizedRequest, assignmentId: Types.ObjectId): Promise<boolean> {
  const assignment = await PracticeAssignment.findOne({ ...eligibilityFilter(req), _id: assignmentId }).select('familyId');
  if (!assignment) return false;
  const blocking = await PracticeAttempt.exists({ userId, familyId: assignment.familyId, status: { $in: ['completed', 'in_progress'] } });
  return !blocking;
}
