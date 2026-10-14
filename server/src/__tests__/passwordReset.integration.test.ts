import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app';
import { User } from '../models/User';
import { PasswordResetToken } from '../models/PasswordResetToken';
import { OutgoingEmail, setMailTransport } from '../services/email/mailer';
import { MAX_RESETS_PER_HOUR } from '../services/passwordReset.service';

let mem: MongoMemoryServer;
const app = createApp();
let outbox: OutgoingEmail[] = [];

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri('password_reset_test'));
  await PasswordResetToken.syncIndexes();
});
afterAll(async () => {
  setMailTransport();
  await mongoose.disconnect();
  await mem.stop();
});
beforeEach(async () => {
  await Promise.all([User.deleteMany({}), PasswordResetToken.deleteMany({})]);
  outbox = [];
  setMailTransport({ send: async (e) => void outbox.push(e) });
});

const signup = () => request(app).post('/api/auth/signup').send({ email: 'ada@example.com', password: 'old-password', name: 'Ada' });
const forgot = (email: string) => request(app).post('/api/auth/password/forgot').send({ email });
const tokenFrom = (email: OutgoingEmail) => /#token=([A-Za-z0-9_-]+)/.exec(email.text)![1];
// Sign-up also sends a confirm-your-email message; these tests only care about resets.
const resets = () => outbox.filter((e) => e.subject === 'Reset your TrakCode password');

describe('forgot password', () => {
  it('emails a reset link, and the answer is the same for unknown addresses', async () => {
    await signup();
    const known = await forgot('ADA@example.com');
    const unknown = await forgot('nobody@example.com');
    expect(known.status).toBe(200);
    expect(unknown.body).toEqual(known.body);
    expect(resets()).toHaveLength(1);
    expect(resets()[0].to).toBe('ada@example.com');
    expect(resets()[0].text).toMatch(/\/reset-password#token=/);
    expect(resets()[0].html).toContain('Choose a new password');
  });

  it('stores only a hash of the token', async () => {
    await signup();
    await forgot('ada@example.com');
    const raw = tokenFrom(resets()[0]);
    const stored = await PasswordResetToken.findOne();
    expect(stored!.tokenHash).not.toBe(raw);
    expect(JSON.stringify(stored)).not.toContain(raw);
  });

  it(`sends at most ${MAX_RESETS_PER_HOUR} links an hour per account`, async () => {
    await signup();
    for (let i = 0; i < MAX_RESETS_PER_HOUR + 2; i++) expect((await forgot('ada@example.com')).status).toBe(200);
    expect(resets()).toHaveLength(MAX_RESETS_PER_HOUR);
  });
});

describe('reset password', () => {
  it('sets the new password, signs the learner in, and works only once', async () => {
    await signup();
    await forgot('ada@example.com');
    const token = tokenFrom(resets()[0]);

    const reset = await request(app).post('/api/auth/password/reset').send({ token, password: 'new-password-1' });
    expect(reset.status).toBe(200);
    expect(reset.body.token).toBeTruthy();
    expect(reset.body.user.email).toBe('ada@example.com');

    expect((await request(app).post('/api/auth/login').send({ email: 'ada@example.com', password: 'old-password' })).status).toBe(401);
    expect((await request(app).post('/api/auth/login').send({ email: 'ada@example.com', password: 'new-password-1' })).status).toBe(200);

    const reuse = await request(app).post('/api/auth/password/reset').send({ token, password: 'another-one-2' });
    expect(reuse.status).toBe(400);
    expect(outbox.map((e) => e.subject)).toContain('Your TrakCode password was changed');
    expect((await User.findOne())!.emailVerified).toBe(true);
  });

  it('rejects an expired link', async () => {
    await signup();
    await forgot('ada@example.com');
    await PasswordResetToken.updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    const res = await request(app).post('/api/auth/password/reset').send({ token: tokenFrom(resets()[0]), password: 'new-password-1' });
    expect(res.status).toBe(400);
  });

  it('a newer reset cancels older outstanding links', async () => {
    await signup();
    await forgot('ada@example.com');
    await forgot('ada@example.com');
    const [first, second] = resets().map(tokenFrom);
    expect((await request(app).post('/api/auth/password/reset').send({ token: second, password: 'new-password-1' })).status).toBe(200);
    expect((await request(app).post('/api/auth/password/reset').send({ token: first, password: 'new-password-2' })).status).toBe(400);
  });

  it('rejects made-up tokens and short passwords', async () => {
    expect((await request(app).post('/api/auth/password/reset').send({ token: 'x'.repeat(43), password: 'new-password-1' })).status).toBe(400);
    await signup();
    await forgot('ada@example.com');
    expect((await request(app).post('/api/auth/password/reset').send({ token: tokenFrom(resets()[0]), password: 'short' })).status).toBe(400);
  });

  it("won't reuse the current or a recent password, and the link survives that mistake", async () => {
    await signup();
    for (const [i, pw] of ['second-password', 'third-password'].entries()) {
      await forgot('ada@example.com');
      const res = await request(app).post('/api/auth/password/reset').send({ token: tokenFrom(resets()[i]), password: pw });
      expect(res.status).toBe(200);
    }
    await forgot('ada@example.com');
    const token = tokenFrom(resets()[2]);
    for (const old of ['third-password', 'second-password', 'old-password']) {
      const res = await request(app).post('/api/auth/password/reset').send({ token, password: old });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/used that password before/);
    }
    // The same link still works for a genuinely new password.
    expect((await request(app).post('/api/auth/password/reset').send({ token, password: 'fourth-password' })).status).toBe(200);
  });

  it('lets a social-only account set a password through its email', async () => {
    await User.create({ email: 'sam@example.com', name: 'Sam', subscriptionStatus: 'none' });
    await forgot('sam@example.com');
    expect((await request(app).post('/api/auth/password/reset').send({ token: tokenFrom(resets()[0]), password: 'brand-new-pass' })).status).toBe(200);
    expect((await request(app).post('/api/auth/login').send({ email: 'sam@example.com', password: 'brand-new-pass' })).status).toBe(200);
  });
});
