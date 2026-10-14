import { Schema, model, Document, Types } from 'mongoose';

// One row per (user, item) the learner has STARTED in the Sequential
// Curriculum. `passedAt` unset = attempted-but-not-passed; set = complete.
// "current" / "locked" are computed from item order + which rows are passed
// (see seq.controller.ts), never stored. Separate from `UserProgress` (Learn
// Mode) on purpose — different feature, different id space (string itemId
// like "py-2.1-04", not an ObjectId).

export interface ISeqProgress extends Document {
  userId: Types.ObjectId;
  course: string;
  topicId: string;
  itemId: string;
  attempts: number;
  passedAt?: Date;
  lastChoice?: string; // last submitted MC letter(s), for concept items
  // Marked complete by the learner's "skip the introduction" action rather
  // than earned — distinguishable from a real pass for later analytics.
  skipped?: boolean;
}

const seqProgressSchema = new Schema<ISeqProgress>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: String, required: true },
  topicId: { type: String, required: true },
  itemId: { type: String, required: true },
  attempts: { type: Number, default: 0, min: 0 },
  passedAt: { type: Date },
  lastChoice: String,
  skipped: { type: Boolean },
});

seqProgressSchema.index({ userId: 1, itemId: 1 }, { unique: true });
seqProgressSchema.index({ userId: 1, topicId: 1 });
// The hottest read in the whole Sequential Curriculum flow: listTopics,
// progressForCourse (seq.controller.ts) and getCompletedTopicNumbers
// (seqPracticeScope.service.ts) all do find({ userId, course }) — three real
// call sites, none of them served by the two indexes above ({userId,itemId}
// requires itemId; {userId,topicId} requires topicId). Verified with
// .explain('executionStats') against a seeded in-memory mongod (one user with
// 240 rows split evenly across 2 courses, 40 other users as noise): before
// this index, Mongo fell back to the {userId,itemId} index and examined all
// 240 of that user's rows to return the 120 matching one course
// (totalDocsExamined 240, nReturned 120); after adding {userId,course},
// totalDocsExamined dropped to exactly 120 — every row examined is a row
// returned, no wasted scanning.
seqProgressSchema.index({ userId: 1, course: 1 });

export const SeqProgress = model<ISeqProgress>('SeqProgress', seqProgressSchema, 'seqProgress');
