import { Schema, model, Document, Types } from 'mongoose';

// Spec §3.5 `userProblemHistory` — dedup so a user is never re-served a problem they've seen
export type ProblemHistoryStatus = 'assigned' | 'completed' | 'abandoned';

export interface IUserProblemHistory extends Document {
  userId: Types.ObjectId;
  problemId: Types.ObjectId;
  servedAt: Date;
  status: ProblemHistoryStatus;
}

const userProblemHistorySchema = new Schema<IUserProblemHistory>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  problemId: { type: Schema.Types.ObjectId, ref: 'Problem', required: true },
  servedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['assigned', 'completed', 'abandoned'], default: 'assigned' },
});

userProblemHistorySchema.index({ userId: 1, problemId: 1 }, { unique: true });

export const UserProblemHistory = model<IUserProblemHistory>(
  'UserProblemHistory',
  userProblemHistorySchema,
  'userProblemHistory'
);
