import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app';
import { User } from '../models/User';
import { Submission } from '../models/Submission';
import { EmailEntitlement } from '../models/EmailEntitlement';
import { signToken } from '../utils/jwt';
import { OutgoingEmail, setMailTransport } from '../services/email/mailer';
import { recordAccountEmail } from '../services/entitlements.service';
import { runScheduledDeletions } from '../services/accountDeletion.service';
import { PracticeAttempt } from '../models/PracticeAttempt';

// Deleting a renewing membership cancels it in Stripe; record what was asked.
const stripeCalls: string[] = [];
jest.mock('../services/stripeClient', () => ({
  getStripeClient: () => ({
    subscriptions: {
      cancel: async (id: string) => void stripeCalls.push(`cancel ${id}`),
      update: async (id: string, p: { cancel_at_period_end?: boolean }) =>
        void stripeCalls.push(`update ${id} cancel_at_period_end=${p.cancel_at_period_end}`),
    },
  }),
}));

let mem: MongoMemoryServer;
const app = createApp();
let outbox: OutgoingEmail[] = [];
const DAY = 86_400_000;

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri('account_deletion_test'));
});
afterAll(async () => {
  setMailTransport();
  await mongoose.disconnect();
  await mem.stop();
});
beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Submission.deleteMany({}), EmailEntitlement.deleteMany({})]);
  outbox = [];
  stripeCalls.length = 0;
  setMailTransport({ send: async (e) => void outbox.push(e) });
});

async function account(overrides: Record<string, unknown> = {}) {
  const user = await User.create({ email: 'ada@example.com', name: 'Ada', subscriptionStatus: 'none', emailVerified: true, ...overrides });
  return { user, auth: `Bearer ${signToken({ userId: user.id, role: user.role })}` };
}
const del = (auth: string, confirmEmail = 'ada@example.com') =>
  request(app).post('/api/profile/account/delete').set('Authorization', auth).send({ confirmEmail });
const state = async (auth: string) => (await request(app).get('/api/profile/account/deletion').set('Authorization', auth)).body.state;
const settle = () => new Promise((r) => setTimeout(r, 50));

describe('delete my account', () => {
  it('with no membership: deletes right away, keeps the founding/trial record, and emails a confirmation', async () => {
    const { user, auth } = await account();
    await recordAccountEmail(user.email, user.createdAt);
    await Submission.create({ userId: user._id, problemId: new mongoose.Types.ObjectId(), code: 'x', language: 'python', result: 'pass' });

    expect((await state(auth)).kind).toBe('immediate');
    const res = await del(auth, 'ADA@example.com');
    expect(res.body).toEqual({ deleted: true });
    await settle();
    expect(await User.countDocuments()).toBe(0);
    expect(await Submission.countDocuments()).toBe(0);
    expect((await EmailEntitlement.findOne())!.foundingMember).toBe(true);
    expect(outbox.map((e) => e.subject)).toContain('Your TrakCode account has been deleted');
  });

  it('needs the account email typed to confirm', async () => {
    const { auth } = await account();
    expect((await del(auth, 'someone@else.com')).status).toBe(400);
    expect(await User.countDocuments()).toBe(1);
  });

  it('a renewing paid membership is cancelled at period end and the account deleted then', async () => {
    const periodEnd = new Date(Date.now() + 10 * DAY);
    const { user, auth } = await account({ subscriptionStatus: 'active', stripeSubscriptionId: 'sub_1', currentPeriodEnd: periodEnd });
    expect((await state(auth)).kind).toBe('renewing');
    const res = await del(auth);
    expect(new Date(res.body.scheduledFor).getTime()).toBe(periodEnd.getTime());
    expect(stripeCalls).toEqual(['update sub_1 cancel_at_period_end=true']);
    const after = (await User.findById(user._id))!;
    expect(after.cancelAtPeriodEnd).toBe(true);
    expect(after.deletionScheduledFor!.getTime()).toBe(periodEnd.getTime());
    // Stripe ends it at period end; the sweep then deletes.
    await User.updateOne({ _id: user._id }, { $set: { subscriptionStatus: 'canceled' } });
    expect(await runScheduledDeletions(new Date(periodEnd.getTime() + DAY))).toEqual({ deleted: 1, kept: 0 });
  });

  it('a free trial is cancelled now (no charge) and the account deleted now', async () => {
    const { auth } = await account({ subscriptionStatus: 'trial', stripeSubscriptionId: 'sub_t', trialEndsAt: new Date(Date.now() + 5 * DAY) });
    expect((await state(auth)).kind).toBe('renewing');
    expect((await state(auth)).trial).toBe(true);
    const res = await del(auth);
    expect(res.body).toEqual({ deleted: true });
    expect(stripeCalls).toEqual(['cancel sub_t']);
    expect(await User.countDocuments()).toBe(0);
  });

  it("deletes the learner's Practice Mode attempts", async () => {
    const { user, auth } = await account();
    await PracticeAttempt.collection.insertOne({ userId: user._id, assignmentId: new mongoose.Types.ObjectId(), code: 'print(1)' });
    await del(auth);
    expect(await PracticeAttempt.countDocuments({ userId: user._id })).toBe(0);
  });

  it('a cancelled membership with paid time left schedules deletion for the end of it; Keep my account calls it off', async () => {
    const periodEnd = new Date(Date.now() + 10 * DAY);
    const { auth } = await account({ subscriptionStatus: 'active', stripeSubscriptionId: 'sub_1', cancelAtPeriodEnd: true, currentPeriodEnd: periodEnd });
    expect((await state(auth)).kind).toBe('at-period-end');

    const res = await del(auth);
    expect(new Date(res.body.scheduledFor).getTime()).toBe(periodEnd.getTime());
    await settle();
    expect(outbox.map((e) => e.subject)).toContain('Your TrakCode account is scheduled for deletion');
    expect((await state(auth)).kind).toBe('scheduled');
    expect((await request(app).get('/api/auth/me').set('Authorization', auth)).body.user.deletionScheduledFor).toBeTruthy();

    // Nothing happens before the date.
    expect(await runScheduledDeletions(new Date())).toEqual({ deleted: 0, kept: 0 });

    await request(app).post('/api/profile/account/delete/cancel').set('Authorization', auth);
    expect((await state(auth)).kind).toBe('at-period-end');
    expect(await runScheduledDeletions(new Date(periodEnd.getTime() + DAY))).toEqual({ deleted: 0, kept: 0 });
    expect(await User.countDocuments()).toBe(1);
  });

  it('the sweep deletes on the date, unless the learner renewed in the meantime', async () => {
    const periodEnd = new Date(Date.now() + 10 * DAY);
    const { user, auth } = await account({ subscriptionStatus: 'active', stripeSubscriptionId: 'sub_1', cancelAtPeriodEnd: true, currentPeriodEnd: periodEnd });
    await del(auth);

    // Renewed: the sweep keeps the account and clears the schedule.
    await User.updateOne({ _id: user._id }, { $set: { cancelAtPeriodEnd: false } });
    expect(await runScheduledDeletions(new Date(periodEnd.getTime() + DAY))).toEqual({ deleted: 0, kept: 1 });
    expect((await User.findById(user._id))!.deletionScheduledFor).toBeUndefined();

    // Cancelled again and re-requested: deleted on the date.
    await User.updateOne({ _id: user._id }, { $set: { cancelAtPeriodEnd: true } });
    await del(auth);
    await User.updateOne({ _id: user._id }, { $set: { subscriptionStatus: 'canceled' } }); // Stripe ended it
    expect(await runScheduledDeletions(new Date(periodEnd.getTime() + DAY))).toEqual({ deleted: 1, kept: 0 });
    expect(await User.countDocuments()).toBe(0);
  });

  it("admin accounts can't be deleted this way", async () => {
    const { auth } = await account({ role: 'admin' });
    expect((await del(auth)).status).toBe(403);
    expect(await User.countDocuments()).toBe(1);
  });
});
