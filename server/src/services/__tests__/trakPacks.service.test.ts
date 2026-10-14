// Tutoring-pack questions tracked per pack: oldest pack first, the "unused"
// check behind the 7-day refund, the backfill for older purchases, and what
// happens on account deletion and in the retention sweep.
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../../models/User';
import { TrakPackPurchase } from '../../models/TrakPackPurchase';
import { UsageEvent } from '../../models/UsageEvent';
import {
  backfillPackRemaining,
  forfeitPacks,
  packsForUser,
  summarizePack,
  takeBoughtQuestion,
} from '../trakPacks.service';
import { recordTrakQuestion, getUsage } from '../usageLimits.service';
import { purgeOldBillingRecords } from '../retention.service';

let mem: MongoMemoryServer;
const DAY = 24 * 60 * 60 * 1000;

beforeAll(async () => {
  mem = await MongoMemoryServer.create({ instance: { dbName: 'trak_packs_test' } });
  await mongoose.connect(mem.getUri('trak_packs_test'));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mem.stop();
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), TrakPackPurchase.deleteMany({}), UsageEvent.deleteMany({})]);
});

let session = 0;
async function buy(userId: Types.ObjectId, questions: number, daysAgo = 0, tracked = true) {
  await User.updateOne({ _id: userId }, { $inc: { bonusTrakQuestions: questions } });
  return TrakPackPurchase.create({
    userId,
    stripeSessionId: `cs_test_${++session}`,
    packId: `pack-${questions}`,
    questions,
    amountCents: 249,
    ...(tracked ? { remaining: questions } : {}),
    createdAt: new Date(Date.now() - daysAgo * DAY),
  });
}

async function learner() {
  return User.create({ email: `p${Math.random()}@example.com`, name: 'P', bonusTrakQuestions: 0 });
}

describe('spending bought questions', () => {
  it('takes from the oldest pack first and records which pack', async () => {
    const u = await learner();
    const older = await buy(u._id, 2, 3);
    const newer = await buy(u._id, 50, 1);

    for (let i = 0; i < 3; i++) await takeBoughtQuestion(u.id);

    expect((await TrakPackPurchase.findById(older._id))!.remaining).toBe(0);
    expect((await TrakPackPurchase.findById(newer._id))!.remaining).toBe(49);
    expect((await User.findById(u._id))!.bonusTrakQuestions).toBe(49);
  });

  it('never goes below zero and leaves packs alone when nothing is left', async () => {
    const u = await learner();
    const pack = await buy(u._id, 1);
    expect((await takeBoughtQuestion(u.id)).taken).toBe(true);
    expect((await takeBoughtQuestion(u.id)).taken).toBe(false);
    expect((await TrakPackPurchase.findById(pack._id))!.remaining).toBe(0);
  });

  it('puts the question back in the pack if the running total had none', async () => {
    const u = await learner();
    const pack = await buy(u._id, 5);
    await User.updateOne({ _id: u._id }, { $set: { bonusTrakQuestions: 0 } });
    expect((await takeBoughtQuestion(u.id)).taken).toBe(false);
    expect((await TrakPackPurchase.findById(pack._id))!.remaining).toBe(5);
  });

  it('handles messages at the same moment without losing or double-counting a question', async () => {
    const u = await learner();
    const pack = await buy(u._id, 3);
    const results = await Promise.all(Array.from({ length: 5 }, () => takeBoughtQuestion(u.id)));
    expect(results.filter((r) => r.taken)).toHaveLength(3);
    expect((await TrakPackPurchase.findById(pack._id))!.remaining).toBe(0);
    expect((await User.findById(u._id))!.bonusTrakQuestions).toBe(0);
  });

  it('logs the pack on the usage record when the weekly allowance is used up', async () => {
    const u = await learner();
    await User.updateOne({ _id: u._id }, { $set: { subscriptionStatus: 'active' } });
    const pack = await buy(u._id, 50);
    const usage = await getUsage((await User.findById(u._id))!);
    expect(usage.trak).not.toBeNull();
    // Pretend the weekly allowance is gone, so the next question uses a pack.
    const exhausted = { ...usage, trak: { ...usage.trak!, remaining: 0 } };
    await recordTrakQuestion(u.id, exhausted);
    const event = await UsageEvent.findOne({ userId: u._id });
    expect(event!.bonus).toBe(true);
    expect(String(event!.packPurchaseId)).toBe(pack.id);
    expect((await TrakPackPurchase.findById(pack._id))!.remaining).toBe(49);
  });
});

describe('the unused check for refunds', () => {
  it('is unused and refundable only while none of its questions were used, within 7 days', async () => {
    const u = await learner();
    await buy(u._id, 50, 2);
    let [p] = await packsForUser(u.id);
    expect(p).toMatchObject({ unused: true, used: 0, withinRefundWindow: true, refundEligible: true });

    await takeBoughtQuestion(u.id);
    [p] = await packsForUser(u.id);
    expect(p).toMatchObject({ unused: false, used: 1, remaining: 49, refundEligible: false });
  });

  it('is not refundable after 7 days even if unused', async () => {
    const u = await learner();
    const pack = await buy(u._id, 50, 8);
    expect(summarizePack(pack)).toMatchObject({ unused: true, withinRefundWindow: false, refundEligible: false });
  });

  it('a newer pack stays unused while an older one is being spent', async () => {
    const u = await learner();
    await buy(u._id, 50, 5);
    await buy(u._id, 150, 1);
    await takeBoughtQuestion(u.id);
    const [newer, older] = await packsForUser(u.id);
    expect(newer).toMatchObject({ questions: 150, unused: true, refundEligible: true });
    expect(older).toMatchObject({ questions: 50, used: 1, unused: false });
  });
});

describe('backfill for packs bought before per-pack tracking', () => {
  it('spreads the balance over packs newest first (older packs were used first)', async () => {
    const u = await learner();
    const oldest = await buy(u._id, 50, 10, false);
    const middle = await buy(u._id, 50, 5, false);
    const newest = await buy(u._id, 50, 1, false);
    // 150 bought, 80 used: 70 left.
    await User.updateOne({ _id: u._id }, { $set: { bonusTrakQuestions: 70 } });

    expect(await backfillPackRemaining()).toBe(3);
    expect((await TrakPackPurchase.findById(newest._id))!.remaining).toBe(50);
    expect((await TrakPackPurchase.findById(middle._id))!.remaining).toBe(20);
    expect((await TrakPackPurchase.findById(oldest._id))!.remaining).toBe(0);

    // Running it again changes nothing.
    expect(await backfillPackRemaining()).toBe(0);
  });

  it("gives a deleted account's old packs nothing left", async () => {
    const ghost = new Types.ObjectId();
    const pack = await TrakPackPurchase.create({
      userId: ghost,
      stripeSessionId: 'cs_ghost',
      packId: 'pack-50',
      questions: 50,
      amountCents: 249,
    });
    await backfillPackRemaining();
    expect((await TrakPackPurchase.findById(pack._id))!.remaining).toBe(0);
  });
});

describe('account deletion and retention', () => {
  it('ends the questions left in each pack but keeps the purchase record', async () => {
    const u = await learner();
    const pack = await buy(u._id, 50);
    await forfeitPacks([u._id]);
    const after = (await TrakPackPurchase.findById(pack._id))!;
    expect(after.remaining).toBe(0);
    expect(after.forfeitedAt).toBeInstanceOf(Date);
    expect(summarizePack(after)).toMatchObject({ unused: false, refundEligible: false, forfeited: true });
  });

  it('never deletes a pack that still has questions, however old', async () => {
    const u = await learner();
    const ancient = await buy(u._id, 50, 365 * 8);
    const spent = await buy(u._id, 1, 365 * 8);
    await TrakPackPurchase.updateOne({ _id: spent._id }, { $set: { remaining: 0 } });
    await purgeOldBillingRecords();
    expect(await TrakPackPurchase.findById(ancient._id)).not.toBeNull();
    expect(await TrakPackPurchase.findById(spent._id)).toBeNull();
  });
});
