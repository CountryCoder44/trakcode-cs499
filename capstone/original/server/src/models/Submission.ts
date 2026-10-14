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
  language: { type: String, enum: ['python', 'javascript', 'cpp'], required: true },
  result: { type: String, enum: ['pass', 'fail', 'error'], required: true },
  testResults: { type: [submissionTestResultSchema], default: [] },
  executionTimeMs: { type: Number, default: 0 },
  submittedAt: { type: Date, default: Date.now },
  pushedToGithub: { type: Boolean, default: false },
  githubRepoUrl: String,
  solvedWithHelp: { type: Boolean, default: false },
});

export const Submission = model<ISubmission>('Submission', submissionSchema, 'submissions');
