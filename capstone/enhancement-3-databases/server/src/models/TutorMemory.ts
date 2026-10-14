import { Schema, model, Document, Types } from 'mongoose';
import { Stack } from '../types/domain';

// Trak's cross-session memory/rapport — global per user, spans both `problem`
// and `curriculumItem` tutor contexts alike. Deliberately NOT session- or
// topic-scoped: this is "does Trak remember who it's talking to," not a
// per-lesson artifact. One document per user (see the unique index below),
// created lazily on first tutor exchange (see tutor.controller.ts).
export type TopicSkillLevel = 'unfamiliar' | 'learning' | 'comfortable' | 'strong';

export interface ITopicSkill {
  topic: string; // short, lowercase, model-normalized label (e.g. "recursion") —
  // there is no shared topic key between Problem.topic and CurriculumItem.title
  // today, so identity here is a judgment call the extraction model makes
  // (reusing existing labels), not a foreign key. See tutor.service.ts.
  stack?: Stack; // set only when the topic is stack-specific
  level: TopicSkillLevel;
  note?: string; // short elaboration, e.g. "struggles with base cases"
  lastUpdated: Date;
}

export interface ITutorMemory extends Document {
  userId: Types.ObjectId;
  // Both fields are a compact, periodically-REWRITTEN profile, not an
  // ever-growing append-only log — the memory-extraction call in
  // tutor.service.ts is instructed to output the full updated text each
  // time, consolidating/resolving contradictions, never just appending a
  // new line. maxlength is a defensive backstop against runaway growth if
  // that instruction is ever not honored.
  goals: string;
  personalNotes: string;
  topicSkills: ITopicSkill[];
  // Updated on every tutor exchange, any context — the "has it been a while"
  // signal that drives an offered refresher on the next opening turn.
  lastInteractionAt: Date;
  createdAt: Date;
}

const topicSkillSchema = new Schema<ITopicSkill>(
  {
    topic: { type: String, required: true, trim: true },
    stack: { type: String, enum: ['python', 'typescript', 'cpp'] },
    level: { type: String, enum: ['unfamiliar', 'learning', 'comfortable', 'strong'], required: true },
    note: { type: String, trim: true },
    lastUpdated: { type: Date, default: Date.now },
  },
  { _id: false }
);

const tutorMemorySchema = new Schema<ITutorMemory>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  goals: { type: String, default: '', maxlength: 1500 },
  personalNotes: { type: String, default: '', maxlength: 1500 },
  topicSkills: { type: [topicSkillSchema], default: [] },
  lastInteractionAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

export const TutorMemory = model<ITutorMemory>('TutorMemory', tutorMemorySchema, 'tutorMemories');
