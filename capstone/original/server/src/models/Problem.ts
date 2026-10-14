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
  stack: { type: String, enum: ['python', 'mern', 'cpp'], required: true, index: true },
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
});

export const Problem = model<IProblem>('Problem', problemSchema, 'problems');
