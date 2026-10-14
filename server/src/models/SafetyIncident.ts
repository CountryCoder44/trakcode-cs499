import { Schema, model, Document, Types } from 'mongoose';

// A learner message to Trak that the moderation check flagged
// (services/tutor/moderation.ts). Kept after the account is deleted, for as
// long as the retention schedule in services/retention.service.ts says
// (Privacy Policy §6): dismissed 90 days after review, warned/banned 3 years
// after review, reported 3 years after the report, legal hold until released.
// Nothing is ever reported to anyone automatically: a person reviews each
// incident in Admin, Safety, and records any report by hand.

export const SAFETY_CATEGORIES = [
  'jailbreak',
  'harassment',
  'sexual-minors',
  'violent-threat',
  'self-harm',
  'illegal-other',
] as const;
export type SafetyCategory = (typeof SAFETY_CATEGORIES)[number];
export const SAFETY_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
export type SafetySeverity = (typeof SAFETY_SEVERITIES)[number];
export type IncidentStatus = 'open' | 'dismissed' | 'reviewed';
export type IncidentAction = 'none' | 'warned' | 'banned';

export interface ISafetyIncident extends Document {
  userId: Types.ObjectId;
  // Copied at the time, so the record still makes sense after account deletion.
  userEmail: string;
  userName: string;
  sessionId?: Types.ObjectId;
  contextType: string;
  contextId: string;
  message: string;
  /** The few turns before the flagged message, for the reviewer. */
  recentContext: { role: string; content: string }[];
  categories: SafetyCategory[];
  severity: SafetySeverity;
  rationale: string;
  /** Trak never replied; the learner got a fixed message instead. */
  blocked: boolean;
  ip?: string;
  status: IncidentStatus;
  action: IncidentAction;
  reviewerId?: Types.ObjectId;
  reviewerNotes?: string;
  reviewedAt?: Date;
  // Filled in by a person after they've made a report (never automatic).
  reportedTo?: string;
  reportedAt?: Date;
  reportReference?: string;
  /** Kept past the normal schedule because a legal matter needs it (set by an admin). */
  legalHold: boolean;
  createdAt: Date;
}

const safetyIncidentSchema = new Schema<ISafetyIncident>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  userEmail: { type: String, required: true },
  userName: { type: String, default: '' },
  sessionId: { type: Schema.Types.ObjectId, ref: 'TutorSession' },
  contextType: { type: String, required: true },
  contextId: { type: String, required: true },
  message: { type: String, required: true },
  recentContext: [{ role: String, content: String, _id: false }],
  categories: [{ type: String, enum: SAFETY_CATEGORIES }],
  severity: { type: String, enum: SAFETY_SEVERITIES, required: true },
  rationale: { type: String, default: '' },
  blocked: { type: Boolean, default: false },
  ip: String,
  status: { type: String, enum: ['open', 'dismissed', 'reviewed'], default: 'open' },
  action: { type: String, enum: ['none', 'warned', 'banned'], default: 'none' },
  reviewerId: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewerNotes: String,
  reviewedAt: Date,
  reportedTo: String,
  reportedAt: Date,
  reportReference: String,
  legalHold: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

safetyIncidentSchema.index({ status: 1, createdAt: -1 });

export const SafetyIncident = model<ISafetyIncident>('SafetyIncident', safetyIncidentSchema, 'safetyIncidents');
