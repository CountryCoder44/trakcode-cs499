import { Schema, model, Document } from 'mongoose';
import { Stack } from '../types/domain';

export type { Stack };

// Spec §3.4 `problems` — the shared problem bank (see §5 for the generation pipeline)
export type Difficulty = 'easy' | 'medium' | 'hard' | 'interview';
export type ProblemType = 'deep_dive' | 'flash_bug' | 'flash_fill';

export interface ITestCase {
  input: string;
  expectedOutput: string;
}

export interface IProblem extends Document {
  stack: Stack;
  topic: string;
  difficulty: Difficulty;
  type: ProblemType;
  prompt: string;
  starterCode: string;
  testCases: ITestCase[];
  // Not `required: true` — same reason as testCaseSchema's fields below:
  // Mongoose's built-in required-check on String rejects empty strings, but
  // problemGeneration.service.ts's exhausted-retries fallback deliberately
  // stores '' here for a generation that failed validation after 3 attempts
  // (flagged for manual review, never served). Found live: that fallback
  // write itself crashed with an unhandled ValidationError instead of the
  // intended graceful "flag and throw a clean message" behavior.
  referenceSolution: string;
  validated: boolean; // passed execution-sandbox validation
  validatedAt?: Date;
  tags: string[];
  contentHash: string; // for dedup detection
  createdAt: Date;
  timesServed: number; // analytics on bank reuse ratio
  // The highest Sequential Curriculum topic number (within `stack`'s matching
  // course) this problem may require — set when generation was scoped to an
  // explicit topic selection (see seqPracticeScope.service.ts). Unset for
  // problems generated before this existed, or for a stack with no Sequential
  // Curriculum course (cpp today) — both are treated as "scope unknown" and
  // excluded from a topic-scoped bank lookup, never served to a learner whose
  // selection doesn't already cover them. This is deliberately a single
  // ceiling, not the exact topic set a given generation drew from — good
  // enough to gate later, different learners' requests against the same
  // stored problem.
  requiredTopicNumber?: number;
}

const testCaseSchema = new Schema<ITestCase>(
  {
    // Not `required: true` — Mongoose's built-in required check on String
    // rejects empty strings, but "" is a legitimate value for both fields
    // (a program that takes no stdin, or one that legitimately prints
    // nothing for a given input). `default: ''` still guarantees presence.
    input: { type: String, default: '' },
    expectedOutput: { type: String, default: '' },
  },
  { _id: false }
);

const problemSchema = new Schema<IProblem>({
  stack: { type: String, enum: ['python', 'typescript', 'cpp'], required: true, index: true },
  topic: { type: String, required: true, index: true, trim: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard', 'interview'], required: true },
  type: { type: String, enum: ['deep_dive', 'flash_bug', 'flash_fill'], required: true },
  prompt: { type: String, required: true },
  starterCode: { type: String, default: '' },
  testCases: { type: [testCaseSchema], default: [] },
  referenceSolution: { type: String, default: '' },
  // Problems that exhausted generation retries (§5 step 3) are stored with
  // validated: false so they never get served (see problemBank.service.ts)
  // but remain visible to GET /admin/problems/pending-review.
  validated: { type: Boolean, default: false, index: true },
  validatedAt: Date,
  tags: { type: [String], default: [], index: true },
  contentHash: { type: String, index: true },
  createdAt: { type: Date, default: Date.now },
  timesServed: { type: Number, default: 0 },
  requiredTopicNumber: { type: Number },
});

// Bank lookups filter on (stack, requiredTopicNumber <= ceiling) together —
// see problemBank.service.ts.
problemSchema.index({ stack: 1, requiredTopicNumber: 1 });

// The two bank-selection query shapes findOrGenerateProblem actually runs
// (Module 2 code review, "add an index to support" deterministic-but-varied
// selection) — requiredTopicNumber and topic are mutually exclusive filters
// (see problemBank.service.ts), so one index can't efficiently serve both;
// each lists its equality fields first, then the `timesServed` sort field
// last (Mongo's Equality-Sort-Range guidance), so `.sort({ timesServed: 1 })`
// is satisfied by the index directly instead of a blocking in-memory sort.
// `requiredTopicNumber <= ceiling` / `_id: { $nin: [...] }` are evaluated as
// in-scan range filters on top of the equality-matched, sort-ordered slice —
// verified against real .explain() output showing an index scan with the
// sort satisfied directly (no blocking in-memory SORT stage).
problemSchema.index({ stack: 1, difficulty: 1, type: 1, validated: 1, timesServed: 1 });
problemSchema.index({ stack: 1, topic: 1, difficulty: 1, type: 1, validated: 1, timesServed: 1 });

export const Problem = model<IProblem>('Problem', problemSchema, 'problems');
