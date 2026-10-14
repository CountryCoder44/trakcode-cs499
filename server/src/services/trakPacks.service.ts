import { Types } from 'mongoose';
import { TrakPackPurchase, ITrakPackPurchase } from '../models/TrakPackPurchase';
import { User } from '../models/User';

// Tutoring-pack questions, tracked per pack. A bought question always comes out
// of the learner's oldest pack that still has questions left, so a pack is
// "unused" only while none of its own questions have been spent.

/** Days after purchase that an unused pack can be refunded (Refunds page). */
export const PACK_REFUND_DAYS = 7;
const DAY = 24 * 60 * 60 * 1000;

/**
 * Spends one bought question. The pack and the learner's running total
 * (User.bonusTrakQuestions) move together; if the total can't go down (another
 * message got there first), the pack is put back.
 */
export async function takeBoughtQuestion(
  userId: string
): Promise<{ taken: boolean; packPurchaseId: Types.ObjectId | null }> {
  const pack = await TrakPackPurchase.findOneAndUpdate(
    { userId, remaining: { $gt: 0 } },
    { $inc: { remaining: -1 } },
    { sort: { createdAt: 1 }, new: true }
  );
  const total = await User.updateOne(
    { _id: userId, bonusTrakQuestions: { $gt: 0 } },
    { $inc: { bonusTrakQuestions: -1 } }
  );
  if (total.modifiedCount === 0) {
    if (pack) await TrakPackPurchase.updateOne({ _id: pack._id }, { $inc: { remaining: 1 } });
    return { taken: false, packPurchaseId: null };
  }
  // A question with no pack behind it (only possible if a total was ever
  // adjusted by hand) still counts; it just isn't tied to a pack.
  return { taken: true, packPurchaseId: pack?._id ?? null };
}

/**
 * One-time fill-in for packs bought before per-pack tracking existed (no
 * `remaining` yet). The learner's current balance is spread over their packs
 * newest first, matching "the oldest pack is used first". Safe to run on every
 * boot: it only touches packs that have no `remaining`.
 */
export async function backfillPackRemaining(): Promise<number> {
  const userIds: Types.ObjectId[] = await TrakPackPurchase.distinct('userId', { remaining: { $exists: false } });
  let filled = 0;
  for (const userId of userIds) {
    const user = await User.findById(userId).select('bonusTrakQuestions');
    const packs = await TrakPackPurchase.find({ userId }).sort({ createdAt: -1 });
    const tracked = packs.filter((p) => typeof p.remaining === 'number').reduce((n, p) => n + p.remaining, 0);
    let balance = Math.max(0, (user?.bonusTrakQuestions ?? 0) - tracked);
    for (const p of packs) {
      if (typeof p.remaining === 'number') continue;
      const left = Math.min(p.questions, balance);
      balance -= left;
      await TrakPackPurchase.updateOne({ _id: p._id, remaining: { $exists: false } }, { $set: { remaining: left } });
      filled++;
    }
  }
  return filled;
}

/** Account deletion: the questions left in each pack end with the account (Terms §3). */
export async function forfeitPacks(userIds: Types.ObjectId[]): Promise<void> {
  await TrakPackPurchase.updateMany(
    { userId: { $in: userIds }, remaining: { $gt: 0 } },
    { $set: { remaining: 0, forfeitedAt: new Date() } }
  );
}

export interface PackSummary {
  id: string;
  packId: string;
  questions: number;
  used: number;
  remaining: number;
  amountCents: number;
  boughtAt: Date;
  stripeSessionId: string;
  /** None of this pack's questions have been used. */
  unused: boolean;
  /** Bought within the last PACK_REFUND_DAYS days. */
  withinRefundWindow: boolean;
  refundWindowEndsAt: Date;
  /** Unused and within the window: qualifies under the Refunds page. */
  refundEligible: boolean;
  forfeited: boolean;
}

export function summarizePack(p: ITrakPackPurchase, now = new Date()): PackSummary {
  const remaining = typeof p.remaining === 'number' ? p.remaining : 0;
  const refundWindowEndsAt = new Date(p.createdAt.getTime() + PACK_REFUND_DAYS * DAY);
  const unused = !p.forfeitedAt && remaining === p.questions;
  const withinRefundWindow = now <= refundWindowEndsAt;
  return {
    id: p.id as string,
    packId: p.packId,
    questions: p.questions,
    used: p.questions - remaining,
    remaining,
    amountCents: p.amountCents,
    boughtAt: p.createdAt,
    stripeSessionId: p.stripeSessionId,
    unused,
    withinRefundWindow,
    refundWindowEndsAt,
    refundEligible: unused && withinRefundWindow,
    forfeited: Boolean(p.forfeitedAt),
  };
}

/** A learner's packs, newest first, for Admin. */
export async function packsForUser(userId: string): Promise<PackSummary[]> {
  const packs = await TrakPackPurchase.find({ userId }).sort({ createdAt: -1 });
  return packs.map((p) => summarizePack(p));
}
