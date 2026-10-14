import { Schema, model, Document, Types } from 'mongoose';

// Spec §3.3 `userProgress`
export type ProgressStatus = 'not_started' | 'in_progress' | 'complete';

export interface IUserProgress extends Document {
  userId: Types.ObjectId;
  curriculumItemId: Types.ObjectId;
  status: ProgressStatus;
  completedAt?: Date;
  // Learn Mode redesign: completing a lesson now means passing 5 distinct
  // AI-served questions on the lesson's topic without Trak revealing a
  // solution for any of them (see curriculumPractice.service.ts). Pinned at
  // 5 — bonus-round passes after completion never increment it further.
  unaidedPassCount: number;
  // The problem currently attached and being worked on for this lesson, if
  // any. Phase is deliberately DERIVED from this rather than stored as a
  // separate enum: unset means the learner should be (or is about to be) in
  // a calibration round; set means they're practicing on that round's
  // problem. This toggles once per round now that calibration recurs before
  // every question, not once per lesson.
  currentProblemId?: Types.ObjectId;
}

const userProgressSchema = new Schema<IUserProgress>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  curriculumItemId: { type: Schema.Types.ObjectId, ref: 'CurriculumItem', required: true },
  status: { type: String, enum: ['not_started', 'in_progress', 'complete'], default: 'not_started' },
  completedAt: Date,
  unaidedPassCount: { type: Number, default: 0 },
  currentProblemId: { type: Schema.Types.ObjectId, ref: 'Problem' },
});

userProgressSchema.index({ userId: 1, curriculumItemId: 1 }, { unique: true });

export const UserProgress = model<IUserProgress>('UserProgress', userProgressSchema, 'userProgress');
