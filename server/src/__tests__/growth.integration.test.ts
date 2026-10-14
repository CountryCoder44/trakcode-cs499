import request from 'supertest';
import mongoose from 'mongoose';
import Stripe from 'stripe';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app';
import { User } from '../models/User';
import { SubscriptionEvent } from '../models/SubscriptionEvent';
import { signToken } from '../utils/jwt';
import { bucketsFor, growthSeries, requiredMonthlyAdds, tally } from '../services/growth.service';
import { syncSubscription } from '../controllers/billing.controller';

let mem: MongoMemoryServer;
const app = createApp();
const DAY = 86_400_000;

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri('growth_test'));
});
afterAll(async () => {
  await mongoose.disconnect();
  await mem.stop();
});
beforeEach(async () => {
  await Promise.all([User.deleteMany({}), SubscriptionEvent.deleteMany({})]);
});

describe('counting rules', () => {
  it('counts conversions, lost trials, refused trials, new and cancelled members', () => {
    const t = tally([
      { from: 'none', to: 'trial' },
      { from: 'trial', to: 'active' },
      { from: 'none', to: 'trial' },
      { from: 'trial', to: 'canceled' },
      { from: 'none', to: 'trial', reason: 'card-reused' },
      { from: 'trial', to: 'canceled', reason: 'card-reused' },
      { from: 'active', to: 'past_due' },
      { from: 'past_due', to: 'active' },
      { from: 'active', to: 'canceled' },
    ]);
    expect(t).toEqual({ trialStarts: 2, conversions: 1, trialLosses: 1, refusedTrials: 1, newPaid: 1, paidCancels: 1 });
  });

  it('works out new members needed per month, allowing for cancellations', () => {
    expect(requiredMonthlyAdds(0, 250, 12, 0.08)).toBe(32);
    expect(requiredMonthlyAdds(0, 120, 12, 0)).toBe(10);
    expect(requiredMonthlyAdds(300, 250, 6, 0)).toBe(0); // already past it, nobody leaving
    expect(requiredMonthlyAdds(300, 250, 6, 0.08)).toBe(14); // 8% leaving a month still needs new members
    expect(requiredMonthlyAdds(10, 250, 0, 0.08)).toBeNull();
  });

  it('uses 7 or 30 days, 26 weeks, or 12 months', () => {
    const now = new Date('2026-10-12T15:00:00Z');
    expect(bucketsFor('week', now)).toHaveLength(7);
    expect(bucketsFor('month', now)).toHaveLength(30);
    const weeks = bucketsFor('6months', now);
    expect(weeks).toHaveLength(26);
    // Weeks after the current one start on a Monday (Eastern).
    expect(new Date(weeks[24].start.getTime() + 12 * 3600_000).getUTCDay()).toBe(1);
    expect(bucketsFor('year', now)).toHaveLength(12);
  });
});

describe('member history', () => {
  async function member(status: string) {
    return User.create({
      email: `${Math.random()}@example.com`,
      name: 'M',
      subscriptionStatus: status,
      emailVerified: true,
    });
  }

  it('rebuilds past member counts from the change log', async () => {
    const a = await member('active');
    const b = await member('active');
    const c = await member('canceled');
    const ago = (days: number) => new Date(Date.now() - days * DAY);
    await SubscriptionEvent.create([
      { userId: a._id, from: 'none', to: 'trial', at: ago(20) },
      { userId: a._id, from: 'trial', to: 'active', at: ago(13) },
      { userId: b._id, from: 'none', to: 'active', at: ago(5) },
      { userId: c._id, from: 'active', to: 'canceled', at: ago(2) },
    ]);

    const month = await growthSeries('month');
    const at = (days: number) => month[month.length - 1 - days];
    expect(at(0).paying).toBe(2); // today: a and b
    expect(at(3).paying).toBe(3); // before c cancelled
    expect(at(10).paying).toBe(2); // a paying, b not yet, c paying
    expect(at(15).trials).toBe(1); // a still on trial
    expect(month.reduce((n, p) => n + p.newPaid, 0)).toBe(2);
    expect(month.reduce((n, p) => n + p.paidCancels, 0)).toBe(1);
  });

  it('the billing sync records each status change', async () => {
    const u = await member('none');
    const sub = (status: string) =>
      ({
        id: 'sub_g',
        status,
        customer: 'cus_g',
        metadata: { userId: u.id },
        items: { data: [] },
      }) as unknown as Stripe.Subscription;
    await syncSubscription(sub('trialing'));
    await syncSubscription(sub('trialing')); // no change, no row
    await syncSubscription(sub('active'));
    const rows = await SubscriptionEvent.find().sort({ at: 1 });
    expect(rows.map((r) => `${r.from}>${r.to}`)).toEqual(['none>trial', 'trial>active']);
  });
});

describe('GET /api/admin/growth', () => {
  it('returns the goal, rates and a series for admins only', async () => {
    const admin = await User.create({
      email: 'owner@example.com',
      name: 'O',
      role: 'admin',
      subscriptionStatus: 'none',
    });
    const learner = await User.create({ email: 'l@example.com', name: 'L', subscriptionStatus: 'active' });
    const auth = (u: typeof admin) => `Bearer ${signToken({ userId: u.id, role: u.role })}`;

    expect((await request(app).get('/api/admin/growth').set('Authorization', auth(learner))).status).toBe(403);
    const res = await request(app).get('/api/admin/growth?range=year').set('Authorization', auth(admin));
    expect(res.status).toBe(200);
    expect(res.body.now.paying).toBe(1);
    expect(res.body.goal).toMatchObject({ target: 250, churnIsAssumed: true, conversionIsAssumed: true });
    expect(res.body.series).toHaveLength(12);
  });
});
