// Learner allowances, the Trak speed limit, request limits and free access,
// against a real ephemeral mongod and the real Express app.
import request from 'supertest';
import Stripe from 'stripe';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app';
import { User } from '../models/User';
import { UsageEvent } from '../models/UsageEvent';
import { AiUsageLog } from '../models/AiUsageLog';
import { signToken } from '../utils/jwt';
import {
  assertCanAskTrak,
  assertCanGeneratePractice,
  easternMonthBounds,
  easternWeekBounds,
  getUsage,
  planFor,
  resetTrakBuckets,
  returnTrakToken,
  takeTrakToken,
  UsageLimitError,
} from '../services/usageLimits.service';
import { TRAK_BURST, TRAK_REFILL_MS } from '../config/constants';

let mem: MongoMemoryServer;
const app = createApp();

beforeAll(async () => {
  mem = await MongoMemoryServer.create({ instance: { dbName: 'usage_limits_test' } });
  await mongoose.connect(mem.getUri('usage_limits_test'));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mem.stop();
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), UsageEvent.deleteMany({}), AiUsageLog.deleteMany({})]);
  resetTrakBuckets();
});

async function learner(overrides: Record<string, unknown> = {}) {
  return User.create({ email: `u${Math.random()}@example.com`, name: 'U', emailVerified: true, subscriptionStatus: 'active', ...overrides });
}

async function used(userId: unknown, kind: 'trak-question' | 'practice-generation', n: number, at = new Date()) {
  await UsageEvent.insertMany(Array.from({ length: n }, () => ({ userId, kind, createdAt: at })));
}

const iso = (d: Date) => d.toISOString();

describe('Eastern-time periods', () => {
  it('weeks run Monday midnight to Monday midnight Eastern, across daylight time', () => {
    // Wed 2026-10-14 15:00 UTC (EDT): week starts Mon 10-12 04:00 UTC.
    const summer = easternWeekBounds(new Date('2026-10-14T15:00:00Z'));
    expect(iso(summer.start)).toBe('2026-10-12T04:00:00.000Z');
    expect(iso(summer.end)).toBe('2026-10-19T04:00:00.000Z');
    // Week containing the November change (Sun 11-01): Mon 10-26 EDT -> Mon 11-02 EST.
    const change = easternWeekBounds(new Date('2026-10-30T12:00:00Z'));
    expect(iso(change.start)).toBe('2026-10-26T04:00:00.000Z');
    expect(iso(change.end)).toBe('2026-11-02T05:00:00.000Z');
    // Late Sunday night Eastern is still the old week (already Monday in UTC).
    const sundayNight = easternWeekBounds(new Date('2026-10-19T03:30:00Z'));
    expect(iso(sundayNight.end)).toBe('2026-10-19T04:00:00.000Z');
  });

  it('months start at midnight Eastern on the 1st', () => {
    const m = easternMonthBounds(new Date('2026-12-15T12:00:00Z'));
    expect(iso(m.start)).toBe('2026-12-01T05:00:00.000Z');
    expect(iso(m.end)).toBe('2027-01-01T05:00:00.000Z');
  });
});

describe('plans', () => {
  it('maps account states to allowances', () => {
    expect(planFor({ role: 'admin', subscriptionStatus: 'none' })).toBe('unlimited');
    expect(planFor({ role: 'user', subscriptionStatus: 'trial' })).toBe('trial');
    for (const s of ['active', 'past_due', 'demo'] as const) expect(planFor({ role: 'user', subscriptionStatus: s })).toBe('member');
    expect(planFor({ role: 'user', subscriptionStatus: 'canceled' })).toBe('none');
  });
});

describe('Trak allowance', () => {
  it('members get 100 questions a week, counting only this week', async () => {
    const u = await learner();
    await used(u._id, 'trak-question', 99);
    await used(u._id, 'trak-question', 40, new Date(Date.now() - 9 * 24 * 60 * 60 * 1000)); // last week
    const usage = await assertCanAskTrak(u.id);
    expect(usage.trak).toMatchObject({ limit: 100, used: 99, remaining: 1, period: 'week' });
    await used(u._id, 'trak-question', 1);
    await expect(assertCanAskTrak(u.id)).rejects.toMatchObject({ statusCode: 429, details: { code: 'TRAK_LIMIT' } });
  });

  it('trial accounts get 20 a day', async () => {
    const u = await learner({ subscriptionStatus: 'trial', trialEndsAt: new Date(Date.now() + 5 * 864e5) });
    await used(u._id, 'trak-question', 20);
    const err = await assertCanAskTrak(u.id).catch((e) => e);
    expect(err).toBeInstanceOf(UsageLimitError);
    expect(err.details.usage.trak).toMatchObject({ limit: 20, remaining: 0, period: 'day' });
    expect(err.message).toMatch(/free-trial/);
  });

  it('admins are never limited', async () => {
    const u = await learner({ role: 'admin', subscriptionStatus: 'none' });
    await used(u._id, 'trak-question', 1000);
    expect((await assertCanAskTrak(u.id)).plan).toBe('unlimited');
  });

  it('stops Trak if this month\'s AI spend passes the hidden backstop', async () => {
    const u = await learner();
    await AiUsageLog.create({ userId: u._id, modelId: 'm', tier: 'reasoning', purpose: 'tutor-reply', estimatedCostUsd: 6.01 });
    await expect(assertCanAskTrak(u.id)).rejects.toMatchObject({ details: { code: 'TRAK_MONTHLY_BACKSTOP' } });
  });
});

describe('practice-question allowance', () => {
  it('members can generate 20 new questions a month', async () => {
    const u = await learner();
    await used(u._id, 'practice-generation', 19);
    await expect(assertCanGeneratePractice(u.id)).resolves.toBeUndefined();
    await used(u._id, 'practice-generation', 1);
    await expect(assertCanGeneratePractice(u.id)).rejects.toMatchObject({ details: { code: 'PRACTICE_LIMIT' } });
  });

  it('new generation stops at the combined monthly AI limit, even with questions left', async () => {
    const u = await learner();
    await used(u._id, 'practice-generation', 2);
    await AiUsageLog.create({ userId: u._id, modelId: 'm', tier: 'fast', purpose: 'tutor-reply', estimatedCostUsd: 5.5 });
    await expect(assertCanGeneratePractice(u.id)).resolves.toBeUndefined();
    await AiUsageLog.create({ userId: u._id, modelId: 'm', tier: 'reasoning', purpose: 'practice-generation', estimatedCostUsd: 0.6 });
    await expect(assertCanGeneratePractice(u.id)).rejects.toMatchObject({ details: { code: 'PRACTICE_LIMIT' } });
    await expect(assertCanAskTrak(u.id)).rejects.toMatchObject({ details: { code: 'TRAK_MONTHLY_BACKSTOP' } });
  });

  it('trials get 5 for the whole trial', async () => {
    const trialEndsAt = new Date(Date.now() + 2 * 864e5); // started 5 days ago
    const u = await learner({ subscriptionStatus: 'trial', trialEndsAt });
    await used(u._id, 'practice-generation', 3, new Date(Date.now() - 4 * 864e5));
    await used(u._id, 'practice-generation', 2);
    const usage = await getUsage(u);
    expect(usage.practice).toMatchObject({ limit: 5, used: 5, remaining: 0, period: 'trial', resetsAt: null });
    await expect(assertCanGeneratePractice(u.id)).rejects.toMatchObject({ details: { code: 'PRACTICE_LIMIT' } });
  });
});

describe('Trak speed limit', () => {
  it('allows a burst, then one message per refill interval', () => {
    const t0 = 1_000_000;
    for (let i = 0; i < TRAK_BURST; i++) expect(takeTrakToken('u1', t0 + i)).toEqual({ ok: true });
    const blocked = takeTrakToken('u1', t0 + 10);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.retryAfterMs).toBeGreaterThan(TRAK_REFILL_MS - 100);
    expect(takeTrakToken('u1', t0 + TRAK_REFILL_MS + 5).ok).toBe(true);
    expect(takeTrakToken('u1', t0 + TRAK_REFILL_MS + 6).ok).toBe(false);
    // Other learners have their own bucket.
    expect(takeTrakToken('u2', t0).ok).toBe(true);
  });

  it('gives a token back when our side fails', () => {
    for (let i = 0; i < TRAK_BURST; i++) takeTrakToken('u3', 1);
    expect(takeTrakToken('u3', 2).ok).toBe(false);
    returnTrakToken('u3');
    expect(takeTrakToken('u3', 3).ok).toBe(true);
  });
});

describe('GET /api/profile/usage', () => {
  it("returns the learner's remaining allowances", async () => {
    const u = await learner();
    await used(u._id, 'trak-question', 8);
    const res = await request(app).get('/api/profile/usage').set('Authorization', `Bearer ${signToken({ userId: u.id, role: 'user' })}`);
    expect(res.status).toBe(200);
    expect(res.body.usage.plan).toBe('member');
    expect(res.body.usage.trak).toMatchObject({ remaining: 92, period: 'week' });
    expect(res.body.usage.practice).toMatchObject({ remaining: 20, period: 'month' });
  });
});

describe('admin free access', () => {
  const adminAuth = async () => {
    const a = await learner({ role: 'admin', subscriptionStatus: 'none' });
    return `Bearer ${signToken({ userId: a.id, role: 'admin' })}`;
  };

  it('grants and removes free access', async () => {
    const auth = await adminAuth();
    const u = await learner({ subscriptionStatus: 'none' });
    const grant = await request(app).post(`/api/admin/users/${u.id}/free-access`).set('Authorization', auth).send({ grant: true });
    expect(grant.status).toBe(200);
    expect((await User.findById(u.id))!.subscriptionStatus).toBe('demo');
    expect(planFor((await User.findById(u.id))!)).toBe('member');
    const revoke = await request(app).post(`/api/admin/users/${u.id}/free-access`).set('Authorization', auth).send({ grant: false });
    expect(revoke.status).toBe(200);
    expect((await User.findById(u.id))!.subscriptionStatus).toBe('none');
  });

  it("won't grant it on top of a Stripe trial or membership", async () => {
    const auth = await adminAuth();
    const u = await learner({ subscriptionStatus: 'active' });
    const res = await request(app).post(`/api/admin/users/${u.id}/free-access`).set('Authorization', auth).send({ grant: true });
    expect(res.status).toBe(409);
  });

  it('is admin-only', async () => {
    const u = await learner();
    const res = await request(app)
      .post(`/api/admin/users/${u.id}/free-access`)
      .set('Authorization', `Bearer ${signToken({ userId: u.id, role: 'user' })}`)
      .send({ grant: true });
    expect(res.status).toBe(403);
  });
});

describe('demo codes no longer create accounts', () => {
  it('has no redeem route', async () => {
    const res = await request(app).post('/api/auth/demo-code/redeem').send({ code: 'ANY' });
    expect(res.status).toBe(404);
  });
});

describe('request limits', () => {
  beforeAll(() => {
    process.env.FORCE_RATE_LIMITS = '1';
  });
  afterAll(() => {
    delete process.env.FORCE_RATE_LIMITS;
  });

  it('blocks the 11th login attempt for one email within 15 minutes', async () => {
    const limited = createApp(); // fresh in-memory counters
    let last = 0;
    for (let i = 0; i < 11; i++) {
      last = (await request(limited).post('/api/auth/login').send({ email: 'Guess@Example.com', password: `wrong-${i}` })).status;
    }
    expect(last).toBe(429);
    // A different email from the same address is counted separately.
    expect((await request(limited).post('/api/auth/login').send({ email: 'other@example.com', password: 'x' })).status).toBe(401);
  });
});

describe('tutoring packs', () => {
  const paidSession = (userId: string, id = `cs_test_${Math.random()}`) =>
    ({
      id,
      mode: 'payment',
      payment_status: 'paid',
      amount_total: 599,
      metadata: { kind: 'trak-pack', userId, packId: 'pack-150', questions: '150' },
    }) as unknown as Stripe.Checkout.Session;

  it('credits a paid pack once, even if Stripe delivers the webhook twice', async () => {
    const { creditTrakPack } = await import('../controllers/billing.controller');
    const u = await learner();
    const session = paidSession(u.id);
    expect(await creditTrakPack(session)).toBe(true);
    expect(await creditTrakPack(session)).toBe(false);
    expect((await User.findById(u.id))!.bonusTrakQuestions).toBe(150);
  });

  it('ignores unpaid sessions and subscription checkouts', async () => {
    const { creditTrakPack } = await import('../controllers/billing.controller');
    const u = await learner();
    expect(await creditTrakPack({ ...paidSession(u.id), payment_status: 'unpaid' } as never)).toBe(false);
    expect(await creditTrakPack({ ...paidSession(u.id), mode: 'subscription' } as never)).toBe(false);
    expect((await User.findById(u.id))!.bonusTrakQuestions).toBe(0);
  });

  it('uses bought questions only after the weekly allowance, then stops at zero', async () => {
    const { recordTrakQuestion } = await import('../services/usageLimits.service');
    const u = await learner({ bonusTrakQuestions: 2 });
    await used(u._id, 'trak-question', 99);
    let usage = await assertCanAskTrak(u.id);
    expect(usage.trak!.remaining).toBe(1);
    usage = await recordTrakQuestion(u.id, usage); // last weekly one
    expect(usage.bonusTrak).toBe(2);
    for (let i = 0; i < 2; i++) {
      usage = await assertCanAskTrak(u.id);
      expect(usage.trak!.remaining).toBe(0);
      await recordTrakQuestion(u.id, usage);
    }
    expect((await User.findById(u.id))!.bonusTrakQuestions).toBe(0);
    await expect(assertCanAskTrak(u.id)).rejects.toMatchObject({ details: { code: 'TRAK_LIMIT' } });
    // Bought questions don't count against the week.
    expect((await getUsage((await User.findById(u.id))!)).trak!.used).toBe(100);
  });

  it('bought questions are never blocked by the fair-use limit, and using them raises it', async () => {
    const u = await learner({ bonusTrakQuestions: 10 });
    await used(u._id, 'trak-question', 99);
    await AiUsageLog.create({ userId: u._id, modelId: 'm', tier: 'reasoning', purpose: 'tutor-reply', estimatedCostUsd: 6.5 });
    // Weekly questions left: the limit applies.
    await expect(assertCanAskTrak(u.id)).rejects.toMatchObject({ details: { code: 'TRAK_MONTHLY_BACKSTOP' } });
    // Weekly questions used up: the next one is bought, so it goes through.
    await used(u._id, 'trak-question', 1);
    await expect(assertCanAskTrak(u.id)).resolves.toMatchObject({ bonusTrak: 10 });
    // Using bought questions raises the limit ($6 + 40 x 1.5¢ = $6.60 > $6.50 spent).
    await UsageEvent.insertMany(Array.from({ length: 40 }, () => ({ userId: u._id, kind: 'trak-question', bonus: true })));
    expect((await getUsage((await User.findById(u.id))!)).fairUse!.percentUsed).toBe(98);
  });

  it('reports the fair-use limit as a percentage, 100 only once reached', async () => {
    const u = await learner();
    expect((await getUsage(u)).fairUse!.percentUsed).toBe(0);
    await AiUsageLog.create({ userId: u._id, modelId: 'm', tier: 'fast', purpose: 'tutor-reply', estimatedCostUsd: 1.5 });
    expect((await getUsage(u)).fairUse!.percentUsed).toBe(25);
    await AiUsageLog.create({ userId: u._id, modelId: 'm', tier: 'fast', purpose: 'tutor-reply', estimatedCostUsd: 4.4999 });
    expect((await getUsage(u)).fairUse!.percentUsed).toBe(99);
    await AiUsageLog.create({ userId: u._id, modelId: 'm', tier: 'fast', purpose: 'tutor-reply', estimatedCostUsd: 0.01 });
    expect((await getUsage(u)).fairUse!.percentUsed).toBe(100);
    const admin = await learner({ role: 'admin', email: 'boss@example.com' });
    expect((await getUsage(admin)).fairUse).toBeNull();
  });

  it('only members can buy', async () => {
    const u = await learner({ subscriptionStatus: 'trial', trialEndsAt: new Date(Date.now() + 864e5) });
    const res = await request(app)
      .post('/api/billing/trak-pack')
      .set('Authorization', `Bearer ${signToken({ userId: u.id, role: 'user' })}`)
      .send({ packId: 'pack-50' });
    // 503 when Stripe isn't configured in this environment; 403 when it is.
    expect([403, 503]).toContain(res.status);
    if (res.status === 403) expect(res.body.details.code).toBe('MEMBERS_ONLY');
  });
});
