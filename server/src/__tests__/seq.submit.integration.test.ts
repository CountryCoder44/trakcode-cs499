// Real integration test: a real Express app (createApp()), a real Mongoose
// connection to a real ephemeral mongod (mongodb-memory-server — the same
// mechanism server/src/config/db.ts uses for local dev), and a real JWT.
// Deliberately exercises a `concept` item (multiple-choice), which never
// calls out to the execution-sandbox microservice, so this test has no
// network dependency on that separate service being up. Sequential
// Curriculum's own submit route (POST /api/seq/topics/:topicId/items/:itemId/submit)
// is the route named directly in the Module 2 code review's Enhancement 1.
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app';
import { SeqTopic } from '../models/SeqTopic';
import { SeqProgress } from '../models/SeqProgress';
import { signToken } from '../utils/jwt';
import { User } from '../models/User';

let mem: MongoMemoryServer;
const app = createApp();

const TOPIC_ID = 'test-topic-01';
const ITEM_ID = 'test-1.1-01';

beforeAll(async () => {
  mem = await MongoMemoryServer.create({ instance: { dbName: 'seq_submit_test' } });
  await mongoose.connect(mem.getUri('seq_submit_test'));

  await SeqTopic.create({
    topicId: TOPIC_ID,
    course: 'python',
    section: 'foundations',
    topicNumber: 1,
    order: 1,
    title: 'Test Topic',
    slug: 'test-topic',
    overview: 'fixture topic for integration tests',
    lessons: [
      {
        lessonId: 'test-1.1',
        number: '1.1',
        title: 'Test Lesson',
        items: [
          {
            itemId: ITEM_ID,
            type: 'concept',
            title: 'A trivial question',
            read: 'What does print("hi") output?',
            check: 'What does print("hi") output?',
            options: [
              { letter: 'A', text: 'hi' },
              { letter: 'B', text: 'print("hi")' },
            ],
            answer: 'A',
            rationale: 'print() writes its argument to stdout.',
            ifIncorrect: 'print("hi") writes hi, not the literal call.',
          },
        ],
      },
    ],
    checkpoint: null,
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mem.stop();
});

// Learn Mode is behind the paywall, so each test signs in as a real,
// subscribed account.
let userCounter = 0;
async function subscribedUserId(): Promise<string> {
  const user = await User.create({
    email: `learner${++userCounter}@example.com`,
    name: 'Learner',
    subscriptionStatus: 'active',
  });
  return user.id;
}

function authHeader(userId: string) {
  return `Bearer ${signToken({ userId, role: 'user' })}`;
}

describe('POST /api/seq/topics/:topicId/items/:itemId/submit', () => {
  it('rejects a request with no auth token', async () => {
    const res = await request(app)
      .post(`/api/seq/topics/${TOPIC_ID}/items/${ITEM_ID}/submit`)
      .send({ kind: 'choice', value: 'A' });
    expect(res.status).toBe(401);
  });

  it('grades a correct answer as passed and records progress', async () => {
    const userId = await subscribedUserId();
    const res = await request(app)
      .post(`/api/seq/topics/${TOPIC_ID}/items/${ITEM_ID}/submit`)
      .set('Authorization', authHeader(userId))
      .send({ kind: 'choice', value: 'A' });

    expect(res.status).toBe(200);
    expect(res.body.passed).toBe(true);
    expect(res.body.rationale).toBe('print() writes its argument to stdout.');

    const row = await SeqProgress.findOne({ userId, itemId: ITEM_ID });
    expect(row).not.toBeNull();
    expect(row!.passedAt).toBeTruthy();
    expect(row!.attempts).toBe(1);
  });

  it('grades a wrong answer as failed and does not mark it passed', async () => {
    const userId = await subscribedUserId();
    const res = await request(app)
      .post(`/api/seq/topics/${TOPIC_ID}/items/${ITEM_ID}/submit`)
      .set('Authorization', authHeader(userId))
      .send({ kind: 'choice', value: 'B' });

    expect(res.status).toBe(200);
    expect(res.body.passed).toBe(false);
    expect(res.body.ifIncorrect).toBe('print("hi") writes hi, not the literal call.');

    const row = await SeqProgress.findOne({ userId, itemId: ITEM_ID });
    expect(row).not.toBeNull();
    expect(row!.passedAt).toBeUndefined();
    expect(row!.attempts).toBe(1);
  });

  it('is order-independent and case/whitespace-insensitive on the submitted choice', async () => {
    const userId = await subscribedUserId();
    const res = await request(app)
      .post(`/api/seq/topics/${TOPIC_ID}/items/${ITEM_ID}/submit`)
      .set('Authorization', authHeader(userId))
      .send({ kind: 'choice', value: ' a ' });

    expect(res.status).toBe(200);
    expect(res.body.passed).toBe(true);
  });

  it('404s for an item that does not exist in the topic', async () => {
    const userId = await subscribedUserId();
    const res = await request(app)
      .post(`/api/seq/topics/${TOPIC_ID}/items/does-not-exist/submit`)
      .set('Authorization', authHeader(userId))
      .send({ kind: 'choice', value: 'A' });
    expect(res.status).toBe(404);
  });
});
