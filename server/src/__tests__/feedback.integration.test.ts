// Feedback button, the learner's Messages inbox, and the admin Feedback inbox,
// through the real app.
import supertest from 'supertest';
import http from 'http';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app';
import { User } from '../models/User';
import { FeedbackThread } from '../models/FeedbackThread';
import { FeedbackScreenshot } from '../models/FeedbackScreenshot';
import { deleteUsersAndData } from '../services/devReset.service';
import { FEEDBACK_RECEIVED_REPLY } from '../controllers/feedback.controller';
import { signToken } from '../utils/jwt';

let mem: MongoMemoryServer;
// One long-lived server for the whole file. supertest's default (a new server
// per request) sometimes resets the larger screenshot transfer on Windows
// while the full suite is running in parallel.
const server = http.createServer(createApp());
const api = () => supertest(server);

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, resolve));
  mem = await MongoMemoryServer.create({ instance: { dbName: 'feedback_test' } });
  await mongoose.connect(mem.getUri('feedback_test'));
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  await mem.stop();
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), FeedbackThread.deleteMany({}), FeedbackScreenshot.deleteMany({})]);
});

async function account(overrides: Record<string, unknown> = {}) {
  const user = await User.create({ email: `u${Math.random()}@example.com`, name: 'Ada', ...overrides });
  return { user, auth: `Bearer ${signToken({ userId: user.id, role: user.role })}` };
}

/** A JPEG-signed payload of about `bytes` bytes, as a data URL. */
function jpegDataUrl(bytes = 64): string {
  const buf = Buffer.alloc(bytes, 7);
  buf[0] = 0xff;
  buf[1] = 0xd8;
  buf[2] = 0xff;
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

describe('sending feedback', () => {
  it('stores the message with an automatic reply and an unread badge', async () => {
    const { auth } = await account();
    const res = await api()
      .post('/api/feedback')
      .set('Authorization', auth)
      .send({ message: 'The run button is hard to find', pagePath: '/practice', viewport: '1280x800' });
    expect(res.status).toBe(201);
    expect(res.body.thread.messages.map((m: { from: string }) => m.from)).toEqual(['user', 'system']);
    expect(res.body.thread.messages[1].body).toBe(FEEDBACK_RECEIVED_REPLY);

    const unread = await api().get('/api/feedback/unread').set('Authorization', auth);
    expect(unread.body.unread).toBe(1);

    // Opening it marks it read.
    const open = await api().get(`/api/feedback/threads/${res.body.thread.id}`).set('Authorization', auth);
    expect(open.status).toBe(200);
    expect((await api().get('/api/feedback/unread').set('Authorization', auth)).body.unread).toBe(0);
  });

  it('works without a subscription (anyone signed in can report a problem)', async () => {
    const { auth } = await account({ subscriptionStatus: 'none' });
    const res = await api().post('/api/feedback').set('Authorization', auth).send({ message: 'hi' });
    expect(res.status).toBe(201);
  });

  it('needs a signed-in account', async () => {
    const res = await api().post('/api/feedback').send({ message: 'hi' });
    expect(res.status).toBe(401);
  });

  it('limits a message to 1000 characters and refuses an empty one', async () => {
    const { auth } = await account();
    expect((await api().post('/api/feedback').set('Authorization', auth).send({ message: 'x'.repeat(1001) })).status).toBe(400);
    expect((await api().post('/api/feedback').set('Authorization', auth).send({ message: '   ' })).status).toBe(400);
    expect((await api().post('/api/feedback').set('Authorization', auth).send({ message: 'x'.repeat(1000) })).status).toBe(201);
  });

  it('accepts a screenshot larger than the usual JSON limit', async () => {
    const { auth } = await account();
    const res = await api()
      .post('/api/feedback')
      .set('Authorization', auth)
      .send({ message: 'see attached', screenshot: jpegDataUrl(150_000) });
    expect(res.status).toBe(201);
    expect(res.body.thread.hasScreenshot).toBe(true);
    const stored = await FeedbackScreenshot.findOne({ threadId: res.body.thread.id });
    expect(stored?.data.length).toBe(150_000);
  });

  it('serves a screenshot back to its owner only', async () => {
    const { auth } = await account();
    const other = await account();
    const res = await api()
      .post('/api/feedback')
      .set('Authorization', auth)
      .send({ message: 'see attached', screenshot: jpegDataUrl(2_000) });
    const id = res.body.thread.id;

    const mine = await api().get(`/api/feedback/threads/${id}/screenshot`).set('Authorization', auth);
    expect(mine.status).toBe(200);
    expect(mine.headers['content-type']).toBe('image/jpeg');
    expect(mine.body.length).toBe(2_000);

    expect((await api().get(`/api/feedback/threads/${id}/screenshot`).set('Authorization', other.auth)).status).toBe(404);
    expect((await api().get(`/api/feedback/threads/${id}`).set('Authorization', other.auth)).status).toBe(404);
  });

  it('refuses a "screenshot" that is not really an image', async () => {
    const { auth } = await account();
    const fake = `data:image/jpeg;base64,${Buffer.from('<script>alert(1)</script>').toString('base64')}`;
    const res = await api().post('/api/feedback').set('Authorization', auth).send({ message: 'x', screenshot: fake });
    expect(res.status).toBe(400);
    expect(await FeedbackThread.countDocuments()).toBe(0);
  });

  it('keeps only an in-app path, never a full URL', async () => {
    const { auth } = await account();
    const res = await api()
      .post('/api/feedback')
      .set('Authorization', auth)
      .send({ message: 'x', pagePath: 'https://evil.example.com/' });
    expect(res.body.thread.pagePath).toBe('');
  });
});

describe('admin feedback inbox', () => {
  it('records bug reports and suggestions separately and filters by them', async () => {
    const learner = await account();
    const admin = await account({ role: 'admin' });
    const bug = await api().post('/api/feedback').set('Authorization', learner.auth).send({ kind: 'bug', message: 'Run does nothing' });
    const idea = await api().post('/api/feedback').set('Authorization', learner.auth).send({ kind: 'idea', message: 'Add dark code themes' });
    expect(bug.body.thread.kind).toBe('bug');
    expect(idea.body.thread.kind).toBe('idea');
    // Older clients that don't send a kind are filed as bug reports.
    const plain = await api().post('/api/feedback').set('Authorization', learner.auth).send({ message: 'no kind' });
    expect(plain.body.thread.kind).toBe('bug');
    expect((await api().post('/api/feedback').set('Authorization', learner.auth).send({ kind: 'rant', message: 'x' })).status).toBe(400);

    const ideas = await api().get('/api/admin/feedback?status=all&kind=idea').set('Authorization', admin.auth);
    expect(ideas.body.threads.map((t: { firstMessage: string }) => t.firstMessage)).toEqual(['Add dark code themes']);
    const bugs = await api().get('/api/admin/feedback?status=all&kind=bug').set('Authorization', admin.auth);
    expect(bugs.body.total).toBe(2);
  });

  it('lists feedback, replies into the learner\'s Messages, and closes it', async () => {
    const learner = await account();
    const admin = await account({ role: 'admin' });
    const sent = await api()
      .post('/api/feedback')
      .set('Authorization', learner.auth)
      .send({ message: 'Lesson 2 has a typo' });
    const id = sent.body.thread.id;
    // The learner reads the automatic reply first.
    await api().get(`/api/feedback/threads/${id}`).set('Authorization', learner.auth);

    const list = await api().get('/api/admin/feedback?status=open').set('Authorization', admin.auth);
    expect(list.status).toBe(200);
    expect(list.body.unreadCount).toBe(1);
    expect(list.body.threads[0].firstMessage).toBe('Lesson 2 has a typo');

    const detail = await api().get(`/api/admin/feedback/${id}`).set('Authorization', admin.auth);
    expect(detail.body.thread.unreadForTeam).toBe(false);

    const reply = await api()
      .post(`/api/admin/feedback/${id}/reply`)
      .set('Authorization', admin.auth)
      .send({ body: 'Fixed, thanks!' });
    expect(reply.status).toBe(200);

    expect((await api().get('/api/feedback/unread').set('Authorization', learner.auth)).body.unread).toBe(1);
    const thread = await api().get(`/api/feedback/threads/${id}`).set('Authorization', learner.auth);
    expect(thread.body.thread.messages.map((m: { from: string; body: string }) => [m.from, m.body]).pop()).toEqual([
      'team',
      'Fixed, thanks!',
    ]);

    await api().post(`/api/admin/feedback/${id}/status`).set('Authorization', admin.auth).send({ status: 'closed' });
    const open = await api().get('/api/admin/feedback?status=open').set('Authorization', admin.auth);
    expect(open.body.threads).toHaveLength(0);
  });

  it('keeps the inbox and replies from regular users', async () => {
    const learner = await account();
    const sent = await api().post('/api/feedback').set('Authorization', learner.auth).send({ message: 'x' });
    expect((await api().get('/api/admin/feedback').set('Authorization', learner.auth)).status).toBe(403);
    expect(
      (
        await api()
          .post(`/api/admin/feedback/${sent.body.thread.id}/reply`)
          .set('Authorization', learner.auth)
          .send({ body: 'I am the team now' })
      ).status
    ).toBe(403);
  });
});

it('deletes feedback and screenshots with the account', async () => {
  const { user, auth } = await account();
  await api().post('/api/feedback').set('Authorization', auth).send({ message: 'x', screenshot: jpegDataUrl() });
  await deleteUsersAndData([user._id]);
  expect(await FeedbackThread.countDocuments()).toBe(0);
  expect(await FeedbackScreenshot.countDocuments()).toBe(0);
});
