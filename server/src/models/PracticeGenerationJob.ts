import { Schema, model, Document, Types } from 'mongoose';

// Coordinates generation of a new shared practice assignment when the bank has
// nothing eligible. Equivalent requests (same normalized requestKey) join one
// running job instead of each generating their own. Uniqueness is enforced on
// the *running* claim only: the bank can hold any number of different
// assignments for the same configuration.
//
// A job holds a lease that the worker renews while it works. If the process
// dies mid-generation the lease simply runs out, the next poll or request marks
// the job failed ('lease-expired'), and a fresh request can claim a new one, so
// nobody waits forever.

export type JobStatus = 'running' | 'succeeded' | 'failed';
export type JobFailureCategory =
  | 'ai-unavailable'
  | 'validation'
  | 'budget'
  | 'lease-expired'
  | 'error';

export interface IPracticeGenerationJob extends Document {
  _id: Types.ObjectId;
  requestKey: string;
  spec: Record<string, unknown>; // the normalized request (see practice/request.ts)
  /** The concept set chosen for generation (random/partial requests are filled in here). */
  chosenConceptIds: string[];
  status: JobStatus;
  leaseOwner: string;
  leaseExpiresAt: Date;
  attempts: number;
  tokensUsed: number;
  validationFailures: { attempt: number; reasons: string[] }[];
  resultAssignmentId?: Types.ObjectId;
  /** True when a re-check after claiming found a bank match, so nothing was generated. */
  resolvedFromBank: boolean;
  failureCategory?: JobFailureCategory;
  failureMessage?: string;
  waiters: { userId: Types.ObjectId; requestId?: string; joinedAt: Date }[];
  startedAt: Date;
  finishedAt?: Date;
}

const practiceGenerationJobSchema = new Schema<IPracticeGenerationJob>({
  requestKey: { type: String, required: true },
  spec: { type: Schema.Types.Mixed, required: true },
  chosenConceptIds: { type: [String], default: [] },
  status: { type: String, enum: ['running', 'succeeded', 'failed'], default: 'running' },
  leaseOwner: { type: String, required: true },
  leaseExpiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0, min: 0 },
  tokensUsed: { type: Number, default: 0, min: 0 },
  validationFailures: { type: [{ attempt: Number, reasons: [String], _id: false }], default: [] },
  resultAssignmentId: { type: Schema.Types.ObjectId, ref: 'PracticeAssignment' },
  resolvedFromBank: { type: Boolean, default: false },
  failureCategory: { type: String, enum: ['ai-unavailable', 'validation', 'budget', 'lease-expired', 'error'] },
  failureMessage: String,
  waiters: {
    type: [{ userId: { type: Schema.Types.ObjectId, ref: 'User' }, requestId: String, joinedAt: Date, _id: false }],
    default: [],
  },
  startedAt: { type: Date, default: Date.now, index: true },
  finishedAt: Date,
});

practiceGenerationJobSchema.index({ requestKey: 1 }, { unique: true, partialFilterExpression: { status: 'running' } });
practiceGenerationJobSchema.index({ 'waiters.userId': 1, 'waiters.requestId': 1 });

export const PracticeGenerationJob = model<IPracticeGenerationJob>(
  'PracticeGenerationJob',
  practiceGenerationJobSchema,
  'practiceGenerationJobs'
);
