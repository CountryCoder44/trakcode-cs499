import { PracticeAttempt } from '../models/PracticeAttempt';
import { PracticeGenerationJob } from '../models/PracticeGenerationJob';
import { PracticeAssignment } from '../models/PracticeAssignment';
import { AiUsageLog } from '../models/AiUsageLog';

// Practice Mode health numbers for the admin dashboard: how often the shared
// bank satisfies requests, what generation costs and how often it fails, and
// whether learners finish and come back. The concept combinations that keep
// triggering generation show where the bank needs coverage.

export async function practiceMetrics(since: Date) {
  const [attemptsBySource, completion, returning, jobsByStatus, jobStats, failureCategories, hotCombos, bank, aiCost] = await Promise.all([
    PracticeAttempt.aggregate<{ _id: string; count: number }>([
      { $match: { startedAt: { $gte: since } } },
      { $group: { _id: '$source', count: { $sum: 1 } } },
    ]),
    PracticeAttempt.aggregate<{ _id: string; count: number }>([
      { $match: { startedAt: { $gte: since }, replay: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    PracticeAttempt.aggregate<{ learners: number; returning: number }>([
      { $match: { startedAt: { $gte: since } } },
      { $group: { _id: '$userId', n: { $sum: 1 } } },
      { $group: { _id: null, learners: { $sum: 1 }, returning: { $sum: { $cond: [{ $gt: ['$n', 1] }, 1, 0] } } } },
    ]),
    PracticeGenerationJob.aggregate<{ _id: string; count: number }>([
      { $match: { startedAt: { $gte: since } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    PracticeGenerationJob.aggregate<{ tokens: number; avgLatencyMs: number | null; validationFailures: number; fromBank: number; generated: number }>([
      { $match: { startedAt: { $gte: since } } },
      {
        $group: {
          _id: null,
          tokens: { $sum: '$tokensUsed' },
          avgLatencyMs: {
            $avg: { $cond: [{ $and: [{ $eq: ['$status', 'succeeded'] }, { $eq: ['$resolvedFromBank', false] }] }, { $subtract: ['$finishedAt', '$startedAt'] }, null] },
          },
          validationFailures: { $sum: { $size: '$validationFailures' } },
          fromBank: { $sum: { $cond: ['$resolvedFromBank', 1, 0] } },
          generated: { $sum: { $cond: [{ $and: [{ $eq: ['$status', 'succeeded'] }, { $eq: ['$resolvedFromBank', false] }] }, 1, 0] } },
        },
      },
    ]),
    PracticeGenerationJob.aggregate<{ _id: string; count: number }>([
      { $match: { startedAt: { $gte: since }, status: 'failed' } },
      { $group: { _id: '$failureCategory', count: { $sum: 1 } } },
    ]),
    PracticeGenerationJob.aggregate<{ _id: { language: string; mode: string; scope: string; concepts: string[] }; count: number }>([
      { $match: { startedAt: { $gte: since }, resolvedFromBank: false } },
      { $group: { _id: { language: '$spec.language', mode: '$spec.mode', scope: '$spec.scope', concepts: '$chosenConceptIds' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    PracticeAssignment.aggregate<{ _id: { language: string; mode: string; scope: string; status: string }; count: number }>([
      { $group: { _id: { language: '$language', mode: '$mode', scope: '$scope', status: '$status' }, count: { $sum: 1 } } },
      { $sort: { '_id.language': 1, '_id.mode': 1, '_id.scope': 1 } },
    ]),
    AiUsageLog.aggregate<{ cost: number; calls: number }>([
      { $match: { createdAt: { $gte: since }, purpose: 'practice-generation' } },
      { $group: { _id: null, cost: { $sum: '$estimatedCostUsd' }, calls: { $sum: 1 } } },
    ]),
  ]);

  const count = (rows: { _id: string; count: number }[]) => Object.fromEntries(rows.map((r) => [r._id ?? 'unknown', r.count]));
  const sources = count(attemptsBySource);
  const fromBank = (sources.bank ?? 0);
  const fromGeneration = (sources.generated ?? 0);
  const statuses = count(completion);
  const started = (statuses.in_progress ?? 0) + (statuses.completed ?? 0) + (statuses.abandoned ?? 0);
  const stats = jobStats[0];

  return {
    since,
    attempts: {
      bySource: sources,
      bankReuseRate: fromBank + fromGeneration ? fromBank / (fromBank + fromGeneration) : null,
      byStatus: statuses,
      completionRate: started ? (statuses.completed ?? 0) / started : null,
      learners: returning[0]?.learners ?? 0,
      returningLearners: returning[0]?.returning ?? 0,
    },
    generation: {
      jobsByStatus: count(jobsByStatus),
      resolvedFromBankAfterClaim: stats?.fromBank ?? 0,
      newAssignments: stats?.generated ?? 0,
      validationFailures: stats?.validationFailures ?? 0,
      failureCategories: count(failureCategories),
      tokensUsed: stats?.tokens ?? 0,
      estimatedCostUsd: aiCost[0]?.cost ?? 0,
      avgLatencyMs: stats?.avgLatencyMs ?? null,
      topRequestedCombinations: hotCombos.map((c) => ({ ...c._id, count: c.count })),
    },
    bank: bank.map((b) => ({ ...b._id, count: b.count })),
  };
}
