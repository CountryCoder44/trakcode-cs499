import { Schema, model, Document, Types } from 'mongoose';

// Learner feedback (the floating Feedback button) and the replies to it, shown
// in the learner's Messages inbox. One thread per piece of feedback: the
// learner's message, an automatic "we got it" note, then any replies from the
// team. A screenshot, if attached, lives in FeedbackScreenshot so listing
// threads never loads image bytes. Deleted with the account.

export type FeedbackAuthor = 'user' | 'system' | 'team';
export type FeedbackStatus = 'open' | 'closed';
/** Picked with the toggle at the top of the form. */
export type FeedbackKind = 'bug' | 'idea';

export interface IFeedbackMessage {
  from: FeedbackAuthor;
  body: string;
  createdAt: Date;
}

export interface IFeedbackThread extends Document {
  userId: Types.ObjectId;
  kind: FeedbackKind;
  /** Copied at submit time so the admin list reads well without a join. */
  userEmail: string;
  userName: string;
  /** Where the learner was: path + query, never the full origin. */
  pagePath: string;
  userAgent: string;
  viewport: string;
  hasScreenshot: boolean;
  status: FeedbackStatus;
  messages: IFeedbackMessage[];
  /** Messages the learner hasn't opened yet (system + team replies). */
  unreadForUser: number;
  /** True until someone on the team opens the thread after the learner wrote. */
  unreadForTeam: boolean;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IFeedbackMessage>(
  {
    from: { type: String, enum: ['user', 'system', 'team'], required: true },
    body: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const feedbackThreadSchema = new Schema<IFeedbackThread>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    kind: { type: String, enum: ['bug', 'idea'], default: 'bug' },
    userEmail: { type: String, default: '' },
    userName: { type: String, default: '' },
    pagePath: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    viewport: { type: String, default: '' },
    hasScreenshot: { type: Boolean, default: false },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    messages: { type: [messageSchema], default: [] },
    unreadForUser: { type: Number, default: 0, min: 0 },
    unreadForTeam: { type: Boolean, default: true },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// The learner's inbox (newest first) and the unread badge.
feedbackThreadSchema.index({ userId: 1, lastMessageAt: -1 });
// The admin inbox, filtered by status.
feedbackThreadSchema.index({ status: 1, lastMessageAt: -1 });

export const FeedbackThread = model<IFeedbackThread>('FeedbackThread', feedbackThreadSchema, 'feedbackThreads');
