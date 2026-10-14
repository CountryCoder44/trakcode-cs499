// Admin, Users, Packs: a learner's tutoring packs with per-pack usage.
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app';
import { User } from '../models/User';
import { TrakPackPurchase } from '../models/TrakPackPurchase';
import { takeBoughtQuestion } from '../services/trakPacks.service';
import { signToken } from '../utils/jwt';

let mem: MongoMemoryServer;
const app = createApp();

beforeAll(async () => {
  mem = await MongoMemoryServer.create({ instance: { dbName: 'admin_packs_test' } });
  await mongoose.connect(mem.getUri('admin_packs_test'));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mem.stop();
});

async function account(overrides: Record<string, unknown> = {}) {
  const user = await User.create({ email: `a${Math.random()}@example.com`, name: 'A', ...overrides });
  return { user, auth: `Bearer ${signToken({ userId: user.id, role: user.role })}` };
}

it("shows an admin each pack's usage and refund eligibility, and keeps it from everyone else", async () => {
  const learner = await account({ bonusTrakQuestions: 200 });
  const admin = await account({ role: 'admin' });
  await TrakPackPurchase.create([
    { userId: learner.user._id, stripeSessionId: 'cs_a', packId: 'pack-50', questions: 50, remaining: 50, amountCents: 249, createdAt: new Date(Date.now() - 2 * 86_400_000) },
    { userId: learner.user._id, stripeSessionId: 'cs_b', packId: 'pack-150', questions: 150, remaining: 150, amountCents: 599 },
  ]);
  await takeBoughtQuestion(learner.user.id);

  const res = await request(app).get(`/api/admin/users/${learner.user.id}/packs`).set('Authorization', admin.auth);
  expect(res.status).toBe(200);
  expect(res.body.balance).toBe(199);
  const [newer, older] = res.body.packs;
  expect(newer).toMatchObject({ stripeSessionId: 'cs_b', used: 0, unused: true, refundEligible: true });
  expect(older).toMatchObject({ stripeSessionId: 'cs_a', used: 1, remaining: 49, unused: false, refundEligible: false });

  expect((await request(app).get(`/api/admin/users/${learner.user.id}/packs`).set('Authorization', learner.auth)).status).toBe(403);
});
