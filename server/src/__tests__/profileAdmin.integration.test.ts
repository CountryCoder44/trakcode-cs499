// Profile prompts, admin guards, and the paywall's reach, through the real app.
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app';
import { env } from '../config/env';
import { User } from '../models/User';
import { EmailEntitlement } from '../models/EmailEntitlement';
import { signToken } from '../utils/jwt';

let mem: MongoMemoryServer;
const app = createApp();
const original = { nodeEnv: env.NODE_ENV };

beforeAll(async () => {
  mem = await MongoMemoryServer.create({ instance: { dbName: 'profile_admin_test' } });
  await mongoose.connect(mem.getUri('profile_admin_test'));
});

afterAll(async () => {
  env.NODE_ENV = original.nodeEnv;
  await mongoose.disconnect();
  await mem.stop();
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), EmailEntitlement.deleteMany({})]);
  env.NODE_ENV = 'dev';
});

async function account(overrides: Record<string, unknown> = {}) {
  const user = await User.create({ email: `u${Math.random()}@example.com`, name: 'U', ...overrides });
  return { user, auth: `Bearer ${signToken({ userId: user.id, role: user.role })}` };
}

describe('dashboard "connect accounts" prompt', () => {
  it('remembers "don\'t show this again" on the account', async () => {
    const { user, auth } = await account();
    const res = await request(app).post('/api/profile/prompts/connect-accounts/dismiss').set('Authorization', auth);
    expect(res.status).toBe(200);
    // Twice is harmless (stored once).
    await request(app).post('/api/profile/prompts/connect-accounts/dismiss').set('Authorization', auth);
    expect((await User.findById(user.id))!.dismissedPrompts).toEqual(['connect-accounts']);
    const me = await request(app).get('/api/auth/me').set('Authorization', auth);
    expect(me.body.user.dismissedPrompts).toEqual(['connect-accounts']);
  });

  it('refuses unknown prompt keys so the list cannot grow without bound', async () => {
    const { auth } = await account();
    const res = await request(app).post('/api/profile/prompts/anything-else/dismiss').set('Authorization', auth);
    expect(res.status).toBe(400);
  });
});

describe('admin guards', () => {
  it('keeps admin pages from regular users', async () => {
    const { auth } = await account();
    for (const path of ['/api/admin/users', '/api/admin/founding-members', '/api/admin/usage/summary', '/api/admin/problems']) {
      expect((await request(app).get(path).set('Authorization', auth)).status).toBe(403);
    }
  });

  it('lets admins in', async () => {
    const { auth } = await account({ role: 'admin' });
    expect((await request(app).get('/api/admin/users').set('Authorization', auth)).status).toBe(200);
  });
});

describe('admin users list and founding members', () => {
  async function entitlement(email: string, founding: boolean) {
    await EmailEntitlement.create({
      emailKey: email.toLowerCase(),
      email,
      firstSeenAt: new Date('2026-10-01'),
      foundingMember: founding,
      foundingSince: founding ? new Date('2026-10-01') : undefined,
    });
  }

  it('searches, filters by subscription, and flags founding members', async () => {
    const { auth } = await account({ role: 'admin', email: 'boss@example.com', name: 'Boss' });
    await User.create({ email: 'ada@example.com', name: 'Ada Lovelace', subscriptionStatus: 'active' });
    await User.create({ email: 'grace@example.com', name: 'Grace', subscriptionStatus: 'trial' });
    await entitlement('ada@example.com', true);

    const search = await request(app).get('/api/admin/users?q=lovelace').set('Authorization', auth);
    expect(search.status).toBe(200);
    expect(search.body.users.map((u: { email: string }) => u.email)).toEqual(['ada@example.com']);
    expect(search.body.users[0].foundingMember).toBe(true);

    const trials = await request(app).get('/api/admin/users?status=trial').set('Authorization', auth);
    expect(trials.body.users.map((u: { email: string }) => u.email)).toEqual(['grace@example.com']);
    expect(trials.body.users[0].foundingMember).toBe(false);
    expect(trials.body.counts.byStatus).toMatchObject({ active: 1, trial: 1 });
    expect(trials.body.counts.foundingMembers).toBe(1);

    // Regex characters in a search are taken literally.
    const odd = await request(app).get('/api/admin/users?q=.*').set('Authorization', auth);
    expect(odd.status).toBe(200);
    expect(odd.body.users).toEqual([]);
  });

  it('keeps founding members on the list after their account is gone', async () => {
    const { auth } = await account({ role: 'admin' });
    await User.create({ email: 'stays@example.com', name: 'S', subscriptionStatus: 'active' });
    await entitlement('stays@example.com', true);
    await entitlement('left@example.com', true);
    await entitlement('not-founding@example.com', false);

    const res = await request(app).get('/api/admin/founding-members').set('Authorization', auth);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    const byEmail = Object.fromEntries(res.body.members.map((m: { email: string }) => [m.email, m]));
    expect(byEmail['stays@example.com']).toMatchObject({ hasAccount: true, subscriptionStatus: 'active' });
    expect(byEmail['left@example.com']).toMatchObject({ hasAccount: false, subscriptionStatus: null });
  });
});

describe('paywall reach', () => {
  const PAID = [
    ['get', '/api/seq/topics?course=python'],
    ['get', '/api/seq/progress'],
    ['get', '/api/practice/history'],
    ['post', '/api/practice/flash-card/request'],
    ['post', '/api/tutor/message'],
    ['get', '/api/portfolio'],
    ['post', '/api/portfolio/push'],
  ] as const;

  it('blocks every paid route for an account without a plan', async () => {
    const { auth } = await account({ subscriptionStatus: 'none' });
    for (const [method, path] of PAID) {
      const res = await request(app)[method](path).set('Authorization', auth).send({});
      expect({ path, status: res.status }).toEqual({ path, status: 402 });
    }
  });

  it('keeps account, billing, profile and roadmap pages open without a plan', async () => {
    const { auth } = await account({ subscriptionStatus: 'none' });
    for (const path of ['/api/auth/me', '/api/billing/status', '/api/profile/me/activity', '/api/roadmap']) {
      const res = await request(app).get(path).set('Authorization', auth);
      expect({ path, status: res.status }).toEqual({ path, status: 200 });
    }
  });
});
