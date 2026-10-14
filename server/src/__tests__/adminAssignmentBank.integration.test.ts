import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app';
import { User } from '../models/User';
import { PracticeAssignment } from '../models/PracticeAssignment';
import { PracticeAttempt } from '../models/PracticeAttempt';
import { signToken } from '../utils/jwt';
import { seedAssignment } from '../practice/__tests__/helpers';

let mem: MongoMemoryServer;
const app = createApp();

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri('assignment_bank_test'));
});
afterAll(async () => {
  await mongoose.disconnect();
  await mem.stop();
});

describe('GET /api/admin/practice/assignments', () => {
  it('lists the bank for admins: filter and sort by language, no private fields, learner stats', async () => {
    const admin = await User.create({
      email: 'owner@example.com',
      name: 'O',
      role: 'admin',
      subscriptionStatus: 'none',
    });
    const learner = await User.create({ email: 'l@example.com', name: 'L', subscriptionStatus: 'active' });
    const auth = (u: typeof admin) => `Bearer ${signToken({ userId: u.id, role: u.role })}`;
    const py = await seedAssignment({ title: 'Beta report', libraryId: 'py-001' });
    await seedAssignment({ title: 'Alpha tracker', language: 'java' });
    await seedAssignment({ title: 'Gamma log', language: 'cpp', libraryId: 'cpp-001' });
    await PracticeAttempt.create({
      userId: learner._id,
      assignmentId: py._id,
      familyId: py.familyId,
      status: 'completed',
    }).catch(() => undefined);

    expect((await request(app).get('/api/admin/practice/assignments').set('Authorization', auth(learner))).status).toBe(
      403,
    );

    const all = await request(app)
      .get('/api/admin/practice/assignments?sort=language&status=published')
      .set('Authorization', auth(admin));
    expect(all.status).toBe(200);
    expect(all.body.items.map((i: { language: string }) => i.language)).toEqual(['cpp', 'java', 'python']);
    expect(all.body.byLanguage).toEqual({ cpp: 1, java: 1, python: 100, typescript: 0 });
    expect(JSON.stringify(all.body)).not.toContain('PRIVATE-REFERENCE-SOLUTION');
    expect(JSON.stringify(all.body)).not.toContain('PRIVATE-PITFALL');
    expect(all.body.items.find((i: { language: string }) => i.language === 'python').tests).toEqual({
      visible: 1,
      hidden: 1,
    });

    const java = await request(app)
      .get('/api/admin/practice/assignments?language=java')
      .set('Authorization', auth(admin));
    expect(java.body.items.map((i: { title: string }) => i.title)).toEqual(['Alpha tracker']);
    const lib = await request(app)
      .get('/api/admin/practice/assignments?source=library&language=cpp')
      .set('Authorization', auth(admin));
    expect(lib.body.items.map((i: { libraryId: string }) => i.libraryId)).toEqual(['cpp-001']);
    // 100 Python library briefs: py-001 is built, so 99 still show as not built.
    const unbuilt = await request(app)
      .get('/api/admin/practice/assignments?status=unbuilt')
      .set('Authorization', auth(admin));
    expect(unbuilt.body.total).toBe(99);
    expect(unbuilt.body.items.map((i: { libraryId: string }) => i.libraryId)).not.toContain('py-001');
    expect(unbuilt.body.items[0]).toMatchObject({ built: false, status: 'unbuilt', language: 'python' });
    const search = await request(app).get('/api/admin/practice/assignments?q=gamma').set('Authorization', auth(admin));
    expect(search.body.total).toBe(1);
    expect(await PracticeAssignment.countDocuments()).toBe(3);
  });
});
