import { Schema, model, Document, Types } from 'mongoose';
import { ExecutionLanguage } from '../types/domain';

// Spec §3.6 `submissions`
export type SubmissionLanguage = ExecutionLanguage;
export type SubmissionResult = 'pass' | 'fail' | 'error';

export interface ISubmissionTestResult {
  passed: boolean;
  actualOutput: string;
  expectedOutput: string;
}

export interface ISubmission extends Document {
  userId: Types.ObjectId;
  problemId: Types.ObjectId;
  code: string;
  language: SubmissionLanguage;
  result: SubmissionResult;
  testResults: ISubmissionTestResult[];
  executionTimeMs: number;
  submittedAt: Date;
  pushedToGithub: boolean;
  githubRepoUrl?: string;
  // Stamped at submit time: does a `revealedSolution:true` TutorSession
  // exist for {userId, contextType:'problem', contextId:problemId}? Drives
  // whether a Learn Mode round's pass counts toward unaidedPassCount — see
  // curriculumPractice.service.ts. Applies to any submission, not just
  // curriculum-linked ones; a plain Practice Mode pass just leaves it false
  // and nothing reads it.
  solvedWithHelp: boolean;
}

const submissionTestResultSchema = new Schema<ISubmissionTestResult>(
  {
    passed: { type: Boolean, required: true },
    actualOutput: { type: String, default: '' },
    expectedOutput: { type: String, default: '' },
  },
  { _id: false }
);

const submissionSchema = new Schema<ISubmission>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  problemId: { type: Schema.Types.ObjectId, ref: 'Problem', required: true, index: true },
  code: { type: String, required: true },
  language: { type: String, enum: ['python', 'typescript', 'cpp'], required: true },
  result: { type: String, enum: ['pass', 'fail', 'error'], required: true },
  testResults: { type: [submissionTestResultSchema], default: [] },
  executionTimeMs: { type: Number, default: 0 },
  submittedAt: { type: Date, default: Date.now },
  pushedToGithub: { type: Boolean, default: false },
  githubRepoUrl: String,
  solvedWithHelp: { type: Boolean, default: false },
});

// getHistory (practice.controller.ts), listPortfolio (portfolio.controller.ts)
// and the public-profile portfolio-links query (profile.controller.ts) all do
// find({ userId, ... }).sort({ submittedAt: -1 }). The single-field userId
// index above serves the filter but not the sort, so Mongo added a separate
// in-memory SORT stage after the IXSCAN. Verified with
// .explain('executionStats') against a seeded in-memory mongod (one user with
// 30 submissions, 40 other users as noise): before this index, the winning
// plan was SORT (inputStage FETCH) — Mongo used the userId index to find the
// 30 matching docs, then sorted them in memory; after adding {userId:1,
// submittedAt:-1}, the winning plan is FETCH over an IXSCAN with no SORT
// stage at all — Mongo walks the compound index in the already-correct
// order. Same totalDocsExamined (30) either way at this scale, but the SORT
// stage is a blocking, unbounded-memory operation that gets worse as a
// user's submission count grows; the compound index removes it entirely
// rather than just doing it faster. Write-cost trade-off: one more index to
// maintain per submission insert (submissions are write-once, so this is a
// one-time cost per document, not a per-update cost) for a query that runs
// on effectively every history/portfolio/profile page load.
submissionSchema.index({ userId: 1, submittedAt: -1 });

export const Submission = model<ISubmission>('Submission', submissionSchema, 'submissions');
