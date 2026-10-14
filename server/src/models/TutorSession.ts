import { Schema, model, Document, Types } from 'mongoose';

// Spec §3.7 `tutorSessions`
// `problem` is a Practice Mode problem. `seqItem` is the Sequential
// Curriculum's "Ask Trak" panel (SeqTopicPage) — unlike `problem`, its
// contextId is not a Mongo ObjectId at all (see the note on the field below).
// `practiceAttempt` is a long-form Practice Mode assignment; its contextId is
// the learner's own PracticeAttempt id.
export type TutorContextType = 'problem' | 'seqItem' | 'practiceAttempt';
export type TutorMessageRole = 'user' | 'tutor';

export interface ITutorMessage {
  role: TutorMessageRole;
  content: string;
  timestamp: Date;
}

export interface ITutorSession extends Document {
  userId: Types.ObjectId;
  contextType: TutorContextType;
  // A plain string, not a Mongo ObjectId — `problem`/`practiceAttempt` pass
  // a real ObjectId's hex string, but `seqItem` passes a composite
  // "<topicId>::<itemId>" (Sequential Curriculum items aren't a top-level
  // collection with their own _id).
  contextId: string;
  // No role-alternation constraint is imposed here — a session whose first
  // stored message is 'tutor' (the opening-turn case, see
  // tutor.controller.ts's `initiate` branch) is perfectly valid at the
  // schema level. That constraint belongs to the Anthropic Messages API for
  // the live call, satisfied there by a synthetic, non-persisted kickoff
  // turn built only for that one API call — never stored here.
  messages: ITutorMessage[];
  createdAt: Date; // also doubles as "session start" for the stuck-signal (tutorContext.service.ts)
  // seqItem-only: stamped whenever an ONGOING seqItem session's contextId is
  // updated to a new item (tutor.controller.ts's sendMessage) — a seqItem
  // session is long-lived and follows the learner from item to item rather
  // than resetting per item, so `createdAt` alone would describe "since this
  // thread began, possibly weeks ago" instead of "since we started talking
  // about the CURRENT item." The stuck-signal (tutorContext.service.ts) uses
  // this instead of createdAt when set. Undefined for problem/practiceAttempt,
  // and for a seqItem session on its very first item (createdAt is already
  // correct there).
  lastContextSwitchAt?: Date;
  // Sticky — set true the first time generateTutorReply returns `revealed:
  // true` for this session (a legitimately offered-and-consented solution
  // reveal actually went through), never unset afterward. Used to stamp
  // Submission.solvedWithHelp for `problem`-context sessions.
  revealedSolution: boolean;
}

const tutorMessageSchema = new Schema<ITutorMessage>(
  {
    role: { type: String, enum: ['user', 'tutor'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const tutorSessionSchema = new Schema<ITutorSession>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  contextType: { type: String, enum: ['problem', 'seqItem', 'practiceAttempt'], required: true },
  contextId: { type: String, required: true },
  messages: { type: [tutorMessageSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
  lastContextSwitchAt: { type: Date },
  revealedSolution: { type: Boolean, default: false },
});

export const TutorSession = model<ITutorSession>('TutorSession', tutorSessionSchema, 'tutorSessions');
