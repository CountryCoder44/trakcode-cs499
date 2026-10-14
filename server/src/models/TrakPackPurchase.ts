import { Schema, model, Document, Types } from 'mongoose';

// One row per paid tutoring pack (billing.controller.ts). The unique Stripe
// Checkout session id makes crediting idempotent: Stripe can deliver the same
// webhook more than once, and a second delivery must not add the questions again.
// Kept after account deletion as a payment record (no learning data in it).
//
// Each pack tracks its own questions (`remaining`): a bought question is taken
// from the oldest pack that still has some (services/trakPacks.service.ts), so
// "was this pack used?" has a real answer for the 7-day unused-pack refund.
// User.bonusTrakQuestions stays as the learner's running total.
export interface ITrakPackPurchase extends Document {
  userId: Types.ObjectId;
  stripeSessionId: string;
  packId: string;
  questions: number;
  amountCents: number;
  /** Questions from this pack not yet used. 0 once used up or the account is deleted. */
  remaining: number;
  /** Set when the account was deleted with questions still left in this pack. */
  forfeitedAt?: Date;
  createdAt: Date;
}

const trakPackPurchaseSchema = new Schema<ITrakPackPurchase>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  stripeSessionId: { type: String, required: true, unique: true },
  packId: { type: String, required: true },
  questions: { type: Number, required: true, min: 1 },
  amountCents: { type: Number, required: true, min: 0 },
  remaining: { type: Number, min: 0 },
  forfeitedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

// The oldest pack with questions left, per learner.
trakPackPurchaseSchema.index({ userId: 1, remaining: 1, createdAt: 1 });

export const TrakPackPurchase = model<ITrakPackPurchase>('TrakPackPurchase', trakPackPurchaseSchema, 'trakPackPurchases');
