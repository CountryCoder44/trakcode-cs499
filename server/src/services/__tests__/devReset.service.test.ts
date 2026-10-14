// Real ephemeral mongod: the point of these tests is that admins and shared
// content survive a reset, which only a real delete can prove.
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../../models/User';
import { Submission } from '../../models/Submission';
import { TutorMemory } from '../../models/TutorMemory';
import { SeqProgress } from '../../models/SeqProgress';
import { SkillRequest } from '../../models/SkillRequest';
import { AiUsageLog } from '../../models/AiUsageLog';
import { deleteUsersAndData } from '../devReset.service';

let mem: MongoMemoryServer;

beforeAll(async () => {
  mem = await MongoMemoryServer.create({ instance: { dbName: 'dev_reset_test' } });
  await mongoose.connect(mem.getUri('dev_reset_test'));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mem.stop();
});

async function seed() {
  const admin = await User.create({ email: 'admin@example.com', name: 'Admin', role: 'admin', passwordHash: 'x' });
  const a = await User.create({ email: 'a@example.com', name: 'A', passwordHash: 'x' });
  const b = await User.create({
    email: 'b@example.com',
    name: 'B',
    identities: [{ provider: 'google', providerUserId: 'g-1' }],
  });
  const problemId = new mongoose.Types.ObjectId();
  for (const u of [admin, a, b]) {
    await Submission.create({ userId: u._id, problemId, code: 'print(1)', language: 'python', result: 'pass' });
    await TutorMemory.create({ userId: u._id });
    await SeqProgress.create({ userId: u._id, course: 'python', topicId: 't1', itemId: 'i1', attempts: 1 });
    await AiUsageLog.create({
      userId: u._id,
      modelId: 'm',
      tier: 'fast',
      purpose: 'tutor-reply',
      inputTokens: 1,
      outputTokens: 1,
    });
  }
  const request = await SkillRequest.create({ title: 'Rust', votes: [admin._id, a._id, b._id] });
  return { admin, a, b, request };
}

beforeEach(async () => {
  await mongoose.connection.db!.dropDatabase();
});

async function nonAdminIds() {
  return (await User.find({ role: { $ne: 'admin' } }).select('_id')).map((u) => u._id);
}

describe('deleteUsersAndData', () => {
  it('deletes every non-admin user and their data, and keeps admins intact', async () => {
    const { admin, request } = await seed();
    const deleted = await deleteUsersAndData(await nonAdminIds());

    expect(deleted).toMatchObject({ users: 2, submissions: 2, tutorMemories: 2, seqProgress: 2, roadmapVotesFrom: 1 });
    expect((await User.find()).map((u) => u.email)).toEqual(['admin@example.com']);
    expect(await Submission.countDocuments({ userId: admin._id })).toBe(1);
    expect(await TutorMemory.countDocuments({ userId: admin._id })).toBe(1);
    expect(await SeqProgress.countDocuments({ userId: admin._id })).toBe(1);
    expect(await Submission.countDocuments()).toBe(1);

    // Roadmap request survives with only the admin's vote left.
    const req = await SkillRequest.findById(request._id);
    expect(req!.votes.map(String)).toEqual([String(admin._id)]);

    // Spend history is kept on purpose.
    expect(await AiUsageLog.countDocuments()).toBe(3);
  });

  it('never deletes an admin, even when asked to', async () => {
    const admin = await User.create({ email: 'admin@example.com', name: 'Admin', role: 'admin', passwordHash: 'x' });
    const deleted = await deleteUsersAndData([admin._id]);
    expect(deleted.users).toBe(0);
    expect(await User.countDocuments()).toBe(1);
  });
});
