// Sign-up, login and /me through the real Express app and a real
// ephemeral mongod.
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app';
import { env } from '../config/env';
import { User } from '../models/User';
import { EmailEntitlement } from '../models/EmailEntitlement';

let mem: MongoMemoryServer;
const app = createApp();
const originalLaunch = env.FOUNDER_LAUNCH_DATE;

beforeAll(async () => {
  mem = await MongoMemoryServer.create({ instance: { dbName: 'auth_test' } });
  await mongoose.connect(mem.getUri('auth_test'));
  await User.syncIndexes();
  env.FOUNDER_LAUNCH_DATE = undefined;
});

afterAll(async () => {
  env.FOUNDER_LAUNCH_DATE = originalLaunch;
  await mongoose.disconnect();
  await mem.stop();
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), EmailEntitlement.deleteMany({})]);
});

const signup = (body: Record<string, unknown>) => request(app).post('/api/auth/signup').send(body);

describe('POST /api/auth/signup', () => {
  it('creates an account with no plan yet and records founding membership', async () => {
    const res = await signup({ email: 'Ada@Example.com', password: 'correct-horse', name: 'Ada' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toMatchObject({ email: 'ada@example.com', subscriptionStatus: 'none', hasAccess: false, hasPassword: true });
    const ent = await EmailEntitlement.findOne({ emailKey: 'ada@example.com' });
    expect(ent!.foundingMember).toBe(true);
    expect(ent!.trialUsedAt).toBeUndefined();
  });

  it('rejects a duplicate email regardless of case', async () => {
    await signup({ email: 'ada@example.com', password: 'correct-horse', name: 'Ada' });
    const res = await signup({ email: 'ADA@example.com', password: 'another-pass', name: 'Ada 2' });
    expect(res.status).toBe(409);
  });

  it('rejects a short password and a malformed email', async () => {
    expect((await signup({ email: 'ada@example.com', password: 'short', name: 'Ada' })).status).toBe(400);
    expect((await signup({ email: 'not-an-email', password: 'correct-horse', name: 'Ada' })).status).toBe(400);
  });

  it('never returns the password hash', async () => {
    const res = await signup({ email: 'ada@example.com', password: 'correct-horse', name: 'Ada' });
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
  });
});

describe('POST /api/auth/login and GET /api/auth/me', () => {
  beforeEach(async () => {
    await signup({ email: 'ada@example.com', password: 'correct-horse', name: 'Ada' });
  });

  it('logs in with the right password (email is case-insensitive)', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'ADA@example.com', password: 'correct-horse' });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('ada@example.com');
  });

  it('gives the same generic error for a wrong password and an unknown email', async () => {
    const wrong = await request(app).post('/api/auth/login').send({ email: 'ada@example.com', password: 'nope-nope' });
    const unknown = await request(app).post('/api/auth/login').send({ email: 'who@example.com', password: 'nope-nope' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error).toBe(unknown.body.error);
  });

  it('/me needs a valid token and reports access', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    expect((await request(app).get('/api/auth/me').set('Authorization', 'Bearer garbage')).status).toBe(401);
    const login = await request(app).post('/api/auth/login').send({ email: 'ada@example.com', password: 'correct-horse' });
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${login.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.user).toMatchObject({ email: 'ada@example.com', hasAccess: false });
  });
});

