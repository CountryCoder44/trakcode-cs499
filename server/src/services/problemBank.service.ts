import { assertCanGeneratePractice, recordUsage } from './usageLimits.service';
import mongoose from 'mongoose';
import { Problem, IProblem, Stack, Difficulty, ProblemType } from '../models/Problem';
import { UserProblemHistory } from '../models/UserProblemHistory';
import { generateValidatedProblem } from './problemGeneration.service';
import { BANK_SELECTION_POOL_SIZE } from '../config/constants';

export interface ProblemRequest {
  userId: string;
  stack: Stack;
  topic?: string;
  difficulty: Difficulty;
  type: ProblemType;
  // Set for topic-scoped requests (seqPracticeScope.service.ts) — a
  // generation-only constraint (see problemGeneration.service.ts's
  // buildPrompt), never affects the bank-hit branch below.
  scopeHint?: string;
  // Set whenever the request is scoped to an explicit Sequential Curriculum
  // topic selection (see seqPracticeScope.service.ts) — the highest topic
  // number the requesting learner is allowed. Unlike scopeHint, this DOES
  // gate the bank-hit branch: only a problem tagged at or below this ceiling
  // is eligible, and a freshly generated one is tagged with it, so it becomes
  // eligible for any other learner whose own ceiling covers it too.
  requiredTopicNumber?: number;
}

// §7: "problem detail (no referenceSolution in response)" — the one
// client-safe projection, shared by every route that ever hands a Problem to
// a client: practice.controller.ts's request/get/submit routes,
// tutor.controller.ts (serializing a newly-attached curriculum problem), and
// curriculum.controller.ts (serializing learnerState.currentProblem). Lives
// here rather than in a controller since multiple controllers need it now.
export function toClientProblem(problem: IProblem) {
  return {
    id: problem.id,
    stack: problem.stack,
    topic: problem.topic,
    difficulty: problem.difficulty,
    type: problem.type,
    prompt: problem.prompt,
    starterCode: problem.starterCode,
    testCases: problem.testCases,
    tags: problem.tags,
  };
}

// Spec §5 "Bank-first lookup (cost control, PRD §9.3)": before triggering
// generation, always query `problems` for a validated match this user hasn't
// seen. Only generate on a miss.
export async function findOrGenerateProblem(req: ProblemRequest): Promise<IProblem> {
  const bankMatch: Record<string, unknown> = {
    stack: req.stack,
    difficulty: req.difficulty,
    type: req.type,
    validated: true,
  };
  if (req.requiredTopicNumber != null) {
    // Topic-number-scoped request: `req.topic` here is a generated label (e.g.
    // "Topic 1 through Topic 2 (2 topics)") that varies with exactly which
    // topics THIS learner picked, so matching on it would defeat the point —
    // two learners who both stayed within topic 2 but picked a different exact
    // topic set would never bank-match each other. requiredTopicNumber is the
    // real scope key here: only a problem tagged at or below this ceiling is
    // eligible. A problem with no requiredTopicNumber at all (generated before
    // this existed, or for a stack with no Sequential Curriculum course) has
    // an unknown scope and is excluded rather than matched by default.
    bankMatch.requiredTopicNumber = { $lte: req.requiredTopicNumber };
  } else if (req.topic) {
    bankMatch.topic = req.topic;
  }

  // Module 2 code review, databases finding: this used to load a user's
  // ENTIRE lifetime problem-history into Node (every problem they've ever
  // been served, no limit) just to build a `$nin` exclusion array — for a
  // long-time user that's an unbounded list re-fetched and re-shipped over
  // the wire on every single practice request, and `$nin` against a large
  // array can't use an index either way (Mongo has to check every candidate
  // against the whole list). The "already seen" check now runs inside Mongo
  // itself via `$lookup`, evaluated per bank candidate against the real
  // `{userId,problemId}` unique index on `userProblemHistory` — nothing
  // resembling the user's full history is ever loaded into this process.
  //
  // findOne(bankQuery) with no sort (the ALSO-original code review finding)
  // returned whatever the storage engine handed back first — effectively
  // insertion order, so reuse wasn't spread evenly and there was no variety.
  // Still fetches the BANK_SELECTION_POOL_SIZE least-served unseen matches,
  // then picks uniformly at random among them: least-served-first ranking
  // gives even reuse distribution, the random pick among near-ties gives
  // real variety — the same "no security weight, so Math.random is the
  // right call" reasoning already used for the client's answer-option
  // shuffle applies here too (picking among equally-eligible practice
  // problems, not anything security-sensitive).
  const userObjectId = new mongoose.Types.ObjectId(req.userId);
  const pool = await Problem.aggregate<{ _id: mongoose.Types.ObjectId }>([
    { $match: bankMatch },
    {
      $lookup: {
        from: 'userProblemHistory',
        let: { problemId: '$_id' },
        pipeline: [
          { $match: { userId: userObjectId, $expr: { $eq: ['$problemId', '$$problemId'] } } },
          { $limit: 1 },
          { $project: { _id: 1 } },
        ],
        as: 'seenByUser',
      },
    },
    { $match: { seenByUser: { $size: 0 } } },
    { $sort: { timesServed: 1 } },
    { $limit: BANK_SELECTION_POOL_SIZE },
    { $project: { _id: 1 } },
  ]);

  let problem: IProblem | null = null;
  if (pool.length > 0) {
    const picked = pool[Math.floor(Math.random() * pool.length)];
    // Atomic $inc, not the old read-then-.save(): two near-simultaneous
    // requests that both land on the same pooled problem now can't race —
    // a read-modify-write lets the second request's write silently clobber
    // the first's increment (last write wins), which $inc can't do.
    problem = await Problem.findByIdAndUpdate(picked._id, { $inc: { timesServed: 1 } }, { new: true });
  }

  if (!problem) {
    // Nothing new in the bank for this learner: generating one costs real AI
    // spend and counts toward their allowance (usageLimits.service.ts).
    await assertCanGeneratePractice(req.userId);
    problem = await generateValidatedProblem({
      stack: req.stack,
      topic: req.topic ?? 'general',
      difficulty: req.difficulty,
      type: req.type,
      scopeHint: req.scopeHint,
      requiredTopicNumber: req.requiredTopicNumber,
      userId: req.userId,
    });
    await recordUsage(req.userId, 'practice-generation');
  }

  // Upsert, not create(): the anti-join above is read-then-write from this
  // request's own point of view, so two near-simultaneous requests for the
  // same user (a double-fired effect, a double-click, two tabs) can both see
  // a problem as "not yet served," both land on it, and then both try to
  // insert the same (userId, problemId) pair — the second hits the unique
  // index and throws E11000 as a raw, uncaught 500. Upserting makes this
  // naturally race-safe: whichever request lands first creates the row, the
  // other is a no-op against the same already-correct state, instead of
  // erroring.
  await UserProblemHistory.updateOne(
    { userId: req.userId, problemId: problem._id },
    { $setOnInsert: { status: 'assigned', servedAt: new Date() } },
    { upsert: true, setDefaultsOnInsert: true }
  );

  return problem;
}
