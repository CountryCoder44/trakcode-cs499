import { Schema, model, Document, Types } from 'mongoose';
import type { PracticeLanguage, PracticeMode, PracticeScope } from '../practice/catalog';

// One learner's private work on one shared PracticeAssignment: their code,
// run results, Trak session and status. Completion is per assignment family,
// so a new content version of something already completed never looks new.

export type AttemptStatus = 'in_progress' | 'completed' | 'abandoned';

export interface IAttemptTestResult {
  name: string;
  visible: boolean;
  passed: boolean;
  // Only stored (and shown) for visible tests: hidden tests report pass/fail only.
  input?: string;
  expectedOutput?: string;
  actualOutput?: string;
  fileChecks?: { path: string; passed: boolean }[];
}

export interface IAttemptRun {
  ranAt: Date;
  allTestsPassed: boolean;
  passedCount: number;
  totalCount: number;
  compileError: string | null;
  stderr: string;
  tests: IAttemptTestResult[];
  evidence: { conceptId: string; label: string; passed: boolean }[];
  completedThisRun: boolean;
}

export interface IPracticeAttempt extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  assignmentId: Types.ObjectId;
  familyId: Types.ObjectId;
  contentVersion: number;
  language: PracticeLanguage;
  mode: PracticeMode;
  scope: PracticeScope;
  advancedConceptIds: string[];
  status: AttemptStatus;
  code: string;
  lastRun?: IAttemptRun;
  runCount: number;
  tutorSessionId?: string;
  /** Client-generated id of the Start click that created this attempt (idempotency). */
  startRequestId?: string;
  source: 'bank' | 'generated' | 'resume' | 'replay';
  /** A deliberate redo of completed work, kept apart from new practice. */
  replay: boolean;
  github?: { url: string; commitUrl: string; repoName: string; pushedAt: Date };
  startedAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  abandonedAt?: Date;
}

const testResultSchema = new Schema<IAttemptTestResult>(
  {
    name: String,
    visible: Boolean,
    passed: Boolean,
    input: String,
    expectedOutput: String,
    actualOutput: String,
    fileChecks: { type: [{ path: String, passed: Boolean, _id: false }], default: undefined },
  },
  { _id: false }
);

const runSchema = new Schema<IAttemptRun>(
  {
    ranAt: Date,
    allTestsPassed: Boolean,
    passedCount: Number,
    totalCount: Number,
    compileError: { type: String, default: null },
    stderr: { type: String, default: '' },
    tests: { type: [testResultSchema], default: [] },
    evidence: { type: [{ conceptId: String, label: String, passed: Boolean, _id: false }], default: [] },
    completedThisRun: Boolean,
  },
  { _id: false }
);

const practiceAttemptSchema = new Schema<IPracticeAttempt>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignmentId: { type: Schema.Types.ObjectId, ref: 'PracticeAssignment', required: true },
    familyId: { type: Schema.Types.ObjectId, required: true },
    contentVersion: { type: Number, required: true },
    language: { type: String, enum: ['python', 'typescript', 'cpp', 'java'], required: true },
    mode: { type: String, enum: ['basics', 'stretch'], required: true },
    scope: { type: String, enum: ['small', 'medium', 'large'], required: true },
    advancedConceptIds: { type: [String], default: [] },
    status: { type: String, enum: ['in_progress', 'completed', 'abandoned'], default: 'in_progress' },
    code: { type: String, default: '' },
    lastRun: runSchema,
    runCount: { type: Number, default: 0, min: 0 },
    tutorSessionId: String,
    startRequestId: String,
    source: { type: String, enum: ['bank', 'generated', 'resume', 'replay'], default: 'bank' },
    replay: { type: Boolean, default: false },
    github: { url: String, commitUrl: String, repoName: String, pushedAt: Date },
    startedAt: { type: Date, default: Date.now },
    completedAt: Date,
    abandonedAt: Date,
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

// At most one active attempt per learner per assignment, whatever the timing
// of double clicks, retries or two tabs.
practiceAttemptSchema.index(
  { userId: 1, assignmentId: 1 },
  { unique: true, partialFilterExpression: { status: 'in_progress' } }
);
// The same Start click (retried or refreshed) always lands on the same attempt.
practiceAttemptSchema.index(
  { userId: 1, startRequestId: 1 },
  { unique: true, partialFilterExpression: { startRequestId: { $type: 'string' } } }
);
// Matching's per-learner exclusions, and the "unfinished work" list.
practiceAttemptSchema.index({ userId: 1, familyId: 1, status: 1 });
practiceAttemptSchema.index({ userId: 1, status: 1, updatedAt: -1 });

export const PracticeAttempt = model<IPracticeAttempt>('PracticeAttempt', practiceAttemptSchema, 'practiceAttempts');
