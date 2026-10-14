import { Schema, model, Document, Types } from 'mongoose';

// The optional screenshot sent with a piece of feedback (a JPEG of what the
// learner was looking at, taken in the browser without the feedback form).
// Kept apart from FeedbackThread so thread lists never carry image bytes.

export interface IFeedbackScreenshot extends Document {
  threadId: Types.ObjectId;
  userId: Types.ObjectId;
  contentType: string;
  data: Buffer;
  createdAt: Date;
}

const feedbackScreenshotSchema = new Schema<IFeedbackScreenshot>({
  threadId: { type: Schema.Types.ObjectId, ref: 'FeedbackThread', required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  contentType: { type: String, required: true },
  data: { type: Buffer, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const FeedbackScreenshot = model<IFeedbackScreenshot>(
  'FeedbackScreenshot',
  feedbackScreenshotSchema,
  'feedbackScreenshots'
);
