import { Schema, model, Document, Types } from 'mongoose';

// Spec §3.7 `tutorSessions`
export type TutorContextType = 'problem' | 'curriculumItem';
export type TutorMessageRole = 'user' | 'tutor';

export interface ITutorMessage {
  role: TutorMessageRole;
  content: string;
  timestamp: Date;
}

export interface ITutorSession extends Document {
  userId: Types.ObjectId;
  contextType: TutorContextType;
  contextId: Types.ObjectId;
  // No role-alternation constraint is imposed here — a session whose first
  // stored message is 'tutor' (the opening-turn case, see
  // tutor.controller.ts's `initiate` branch) is perfectly valid at the
  // schema level. That constraint belongs to the Anthropic Messages API for
  // the live call, satisfied there by a synthetic, non-persisted kickoff
  // turn built only for that one API call — never stored here.
  messages: ITutorMessage[];
  createdAt: Date; // also doubles as "session start" for the stuck-signal (tutorContext.service.ts)
  // Sticky — set true the first time generateTutorReply returns `revealed:
  // true` for this session (a legitimately offered-and-consented solution
  // reveal actually went through), never unset afterward. Used to stamp
  // Submission.solvedWithHelp for `problem`-context sessions, and gates
  // whether a curriculum round's pass counts toward unaidedPassCount — see
  // server/src/services/curriculumPractice.service.ts.
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
  contextType: { type: String, enum: ['problem', 'curriculumItem'], required: true },
  contextId: { type: Schema.Types.ObjectId, required: true },
  messages: { type: [tutorMessageSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
  revealedSolution: { type: Boolean, default: false },
});

export const TutorSession = model<ITutorSession>('TutorSession', tutorSessionSchema, 'tutorSessions');
