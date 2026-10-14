import { Schema, model, Document, Types } from 'mongoose';

// Spec §3.8 `skillRequests` — Skill Roadmap & Requests (PRD §5.6)
export type SkillRequestStatus = 'requested' | 'planned' | 'in_progress' | 'live';

export interface ISkillRequest extends Document {
  title: string;
  description: string;
  status: SkillRequestStatus;
  votes: Types.ObjectId[]; // userIds, dedup via Set semantics
  createdAt: Date;
  liveAt?: Date; // set when status -> 'live', triggers notifications
}

const skillRequestSchema = new Schema<ISkillRequest>({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['requested', 'planned', 'in_progress', 'live'], default: 'requested' },
  votes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
  liveAt: Date,
});

export const SkillRequest = model<ISkillRequest>('SkillRequest', skillRequestSchema, 'skillRequests');
