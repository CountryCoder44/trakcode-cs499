import { Problem, IProblem, Stack, Difficulty, ProblemType } from '../models/Problem';
import { UserProblemHistory } from '../models/UserProblemHistory';
import { generateValidatedProblem } from './problemGeneration.service';

export interface ProblemRequest {
  userId: string;
  stack: Stack;
  topic?: string;
  difficulty: Difficulty;
  type: ProblemType;
  // Only set by curriculumPractice.service.ts's attachNextProblem — a
  // generation-only constraint (see problemGeneration.service.ts's
  // buildPrompt), never affects the bank-hit branch below. Plain Practice
  // Mode/Flash Card requests (practice.controller.ts) never set this, so
  // their generation behavior is unchanged.
  scopeHint?: string;
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
  const seenProblemIds = (
    await UserProblemHistory.find({ userId: req.userId }).select('problemId').lean()
  ).map((h) => h.problemId);

  const bankQuery: Record<string, unknown> = {
    stack: req.stack,
    difficulty: req.difficulty,
    type: req.type,
    validated: true,
    _id: { $nin: seenProblemIds },
  };
  if (req.topic) bankQuery.topic = req.topic;

  let problem: IProblem | null = await Problem.findOne(bankQuery);

  if (problem) {
    problem.timesServed += 1;
    await problem.save();
  } else {
    problem = await generateValidatedProblem({
      stack: req.stack,
      topic: req.topic ?? 'general',
      difficulty: req.difficulty,
      type: req.type,
      scopeHint: req.scopeHint,
      userId: req.userId,
    });
  }

  // Upsert, not create(): the seenProblemIds check above is read-then-write,
  // so two near-simultaneous requests for the same user (a double-fired
  // effect, a double-click, two tabs) can both read "not yet served," both
  // land on the same bank problem, and then both try to insert the same
  // (userId, problemId) pair — the second hits the unique index and throws
  // E11000 as a raw, uncaught 500. Upserting makes this naturally race-safe:
  // whichever request lands first creates the row, the other is a no-op
  // against the same already-correct state, instead of erroring.
  await UserProblemHistory.updateOne(
    { userId: req.userId, problemId: problem._id },
    { $setOnInsert: { status: 'assigned', servedAt: new Date() } },
    { upsert: true, setDefaultsOnInsert: true }
  );

  return problem;
}
