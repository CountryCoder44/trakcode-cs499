import { Schema, model, Document, Types } from 'mongoose';

// One free trial per payment card (services/trialCards.service.ts). Stripe gives
// every card a fingerprint that stays the same across customers, so a card that
// already started a trial under one email can't start another under a new one.
// Kept after account deletion, like the per-email trial record. No card details
// are stored: the fingerprint is an opaque Stripe id.
export interface ITrialCard extends Document {
  fingerprint: string;
  emailKey: string;
  userId: Types.ObjectId;
  subscriptionId: string;
  createdAt: Date;
}

const trialCardSchema = new Schema<ITrialCard>({
  fingerprint: { type: String, required: true, unique: true },
  emailKey: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  subscriptionId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const TrialCard = model<ITrialCard>('TrialCard', trialCardSchema, 'trialCards');
