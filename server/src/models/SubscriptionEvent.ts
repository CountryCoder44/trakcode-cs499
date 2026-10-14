import { Schema, model, Document, Types } from 'mongoose';
import type { SubscriptionStatus } from './User';

// One row each time an account's membership status changes (written by the
// billing webhook sync, billing.controller.ts). The Admin Growth tab measures
// trial conversion and churn from these. No personal details: just the account
// id and the change. Kept when an account is deleted, like AiUsageLog, so past
// growth numbers don't shift.
export interface ISubscriptionEvent extends Document {
  userId: Types.ObjectId;
  from: SubscriptionStatus;
  to: SubscriptionStatus;
  /** 'card-reused': a trial refused under one-trial-per-card (not a real trial). */
  reason?: string;
  at: Date;
}

const subscriptionEventSchema = new Schema<ISubscriptionEvent>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  from: { type: String, required: true },
  to: { type: String, required: true },
  reason: String,
  at: { type: Date, default: Date.now, index: true },
});

export const SubscriptionEvent = model<ISubscriptionEvent>(
  'SubscriptionEvent',
  subscriptionEventSchema,
  'subscriptionEvents',
);
