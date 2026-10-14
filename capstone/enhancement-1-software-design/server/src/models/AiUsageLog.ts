import { Schema, model, Document, Types } from 'mongoose';

// One document per real Anthropic API call — added as part of the
// token-usage investigation (see CLAUDE.md) once it became clear nothing
// was actually persisting `response.usage`, only ever using it transiently.
// A raw per-call log, not pre-aggregated rollups — this app's scale doesn't
// need that complexity; aggregation happens at query time in
// admin.controller.ts. Every current call site funnels through
// aiUsage.service.ts's logAiUsage(), never written to directly.
export type AiUsagePurpose =
  | 'tutor-reply'
  | 'tutor-guardrail'
  | 'tutor-readiness'
  | 'tutor-memory-extraction'
  | 'problem-generation';

// Mirrors aiClient.ts's MODEL_REASONING/MODEL_FAST split.
export type AiModelTier = 'reasoning' | 'fast';

export interface IAiUsageLog extends Document {
  // Every current call site has one (all five originate from a logged-in
  // user's request) — optional only so a future system-triggered call
  // (a cron job, an admin-triggered batch regeneration) isn't forced to
  // fabricate one.
  userId?: Types.ObjectId;
  // Exact model id actually used, e.g. 'claude-sonnet-5'. Named modelId, not
  // model — `model` collides with Mongoose's own Document.model() method.
  modelId: string;
  tier: AiModelTier;
  purpose: AiUsagePurpose;
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
  // Best-effort estimate only (see aiUsage.service.ts's pricing table) — the
  // Anthropic Console's own billing is the real source of truth, not this.
  estimatedCostUsd: number;
  createdAt: Date;
}

const aiUsageLogSchema = new Schema<IAiUsageLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  modelId: { type: String, required: true, index: true },
  tier: { type: String, enum: ['reasoning', 'fast'], required: true, index: true },
  purpose: {
    type: String,
    enum: ['tutor-reply', 'tutor-guardrail', 'tutor-readiness', 'tutor-memory-extraction', 'problem-generation'],
    required: true,
    index: true,
  },
  inputTokens: { type: Number, default: 0, min: 0 },
  outputTokens: { type: Number, default: 0, min: 0 },
  cacheCreationInputTokens: { type: Number, default: 0, min: 0 },
  cacheReadInputTokens: { type: Number, default: 0, min: 0 },
  estimatedCostUsd: { type: Number, default: 0, min: 0 },
  createdAt: { type: Date, default: Date.now, index: true },
});

// Considered adding {userId,createdAt} and {purpose,createdAt} compound
// indexes here (the code review's initial speculation) but checked first
// against how admin.controller.ts actually queries this collection:
// getUsageSummary and getUsageByUser both $match on createdAt ONLY (the
// existing single-field index already serves that) and only filter by
// userId/purpose inside the later $group stage, which an index can't
// accelerate. A compound index that's never a query's leading filter field
// buys nothing here and would just cost extra write-time index maintenance
// on every logAiUsage() call (fired on every AI call in the app) — so,
// verified and deliberately not added. Revisit if a future endpoint adds a
// real per-user or per-purpose date-range filter.
export const AiUsageLog = model<IAiUsageLog>('AiUsageLog', aiUsageLogSchema, 'aiUsageLogs');
