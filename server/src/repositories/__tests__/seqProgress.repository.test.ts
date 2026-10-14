// Real integration-style test: a real ephemeral mongod (mongodb-memory-server
// — the same mechanism server/src/__tests__/seq.submit.integration.test.ts
// and server/src/services/__tests__/problemBank.service.test.ts both use).
// Module 2 code review, databases finding: "duplicated query logic, no
// data-access layer" — this is the first direct test coverage of the
// repository module that consolidated those nine call sites (see the
// module's own header comment).
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { SeqTopic, ISeqTopic, SeqItem } from '../../models/SeqTopic';
import { SeqProgress } from '../../models/SeqProgress';
import {
  getProgressMapsByCourse,
  getProgressByTopic,
  getCompletedItemCountByTopic,
  recordAttempt,
  markTopicSkipped,
  resetTopicProgress,
  findAllDistinctProgressKeys,
  deleteProgressRowsByIds,
} from '../seqProgress.repository';

let mem: MongoMemoryServer;

beforeAll(async () => {
  mem = await MongoMemoryServer.create({ instance: { dbName: 'seq_progress_repo_test' } });
  await mongoose.connect(mem.getUri('seq_progress_repo_test'));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mem.stop();
});

afterEach(async () => {
  await SeqTopic.deleteMany({});
  await SeqProgress.deleteMany({});
});

// Two topics in the same course, mirroring a real learner's shape closely
// enough to exercise every repository function without a live HTTP layer.
async function seedTopics(): Promise<{ topicA: ISeqTopic; topicB: ISeqTopic; conceptItem: SeqItem; practicalItem: SeqItem }> {
  const topicA = await SeqTopic.create({
    topicId: 'repo-test-topic-a',
    course: 'python',
    section: 'foundations',
    topicNumber: 1,
    order: 1,
    title: 'Topic A',
    slug: 'topic-a',
    overview: 'fixture',
    lessons: [
      {
        lessonId: 'repo-test-1.1',
        number: '1.1',
        title: 'Lesson 1.1',
        items: [
          {
            itemId: 'repo-test-1.1-01',
            type: 'concept',
            title: 'A question',
            read: 'read',
            check: 'check',
            options: [
              { letter: 'A', text: 'right' },
              { letter: 'B', text: 'wrong' },
            ],
            answer: 'A',
            rationale: 'rationale',
            ifIncorrect: 'ifIncorrect',
          },
          {
            itemId: 'repo-test-1.1-02',
            type: 'practical',
            title: 'An exercise',
            do: 'do it',
            starterCode: '',
            solution: 'print(1)',
            evaluator: 'browser-exec',
            expectExactOutput: '1',
          },
        ],
      },
    ],
    checkpoint: null,
  });

  const topicB = await SeqTopic.create({
    topicId: 'repo-test-topic-b',
    course: 'python',
    section: 'foundations',
    topicNumber: 2,
    order: 2,
    title: 'Topic B',
    slug: 'topic-b',
    overview: 'fixture',
    lessons: [
      {
        lessonId: 'repo-test-2.1',
        number: '2.1',
        title: 'Lesson 2.1',
        items: [
          {
            itemId: 'repo-test-2.1-01',
            type: 'concept',
            title: 'Another question',
            read: 'read',
            check: 'check',
            options: [
              { letter: 'A', text: 'right' },
              { letter: 'B', text: 'wrong' },
            ],
            answer: 'A',
            rationale: 'rationale',
            ifIncorrect: 'ifIncorrect',
          },
        ],
      },
    ],
    checkpoint: null,
  });

  const conceptItem = (topicA.lessons[0].items[0] as unknown) as SeqItem;
  const practicalItem = (topicA.lessons[0].items[1] as unknown) as SeqItem;
  return { topicA, topicB, conceptItem, practicalItem };
}

function userId(): string {
  return new mongoose.Types.ObjectId().toString();
}

describe('getProgressMapsByCourse', () => {
  it('scopes to the given course and reduces rows to passed/skipped item-id sets', async () => {
    const { topicA, topicB } = await seedTopics();
    const uid = userId();
    await SeqProgress.create([
      { userId: uid, course: topicA.course, topicId: topicA.topicId, itemId: 'repo-test-1.1-01', attempts: 1, passedAt: new Date() },
      { userId: uid, course: topicA.course, topicId: topicA.topicId, itemId: 'repo-test-1.1-02', attempts: 1 },
      { userId: uid, course: topicB.course, topicId: topicB.topicId, itemId: 'repo-test-2.1-01', attempts: 1, passedAt: new Date(), skipped: true },
      // A different course entirely must never leak in.
      { userId: uid, course: 'typescript', topicId: 'ts-topic-01', itemId: 'ts-1.1-01', attempts: 1, passedAt: new Date() },
    ]);

    const { passed, skipped } = await getProgressMapsByCourse(uid, 'python');

    expect(passed).toEqual(new Set(['repo-test-1.1-01', 'repo-test-2.1-01']));
    expect(skipped).toEqual(new Set(['repo-test-2.1-01']));
  });

  it('never mixes one user\'s rows into another user\'s result', async () => {
    const { topicA } = await seedTopics();
    const uidOne = userId();
    const uidTwo = userId();
    await SeqProgress.create([
      { userId: uidOne, course: topicA.course, topicId: topicA.topicId, itemId: 'repo-test-1.1-01', attempts: 1, passedAt: new Date() },
      { userId: uidTwo, course: topicA.course, topicId: topicA.topicId, itemId: 'repo-test-1.1-02', attempts: 1, passedAt: new Date() },
    ]);

    const { passed } = await getProgressMapsByCourse(uidOne, 'python');
    expect(passed).toEqual(new Set(['repo-test-1.1-01']));
  });
});

describe('getProgressByTopic', () => {
  it('scopes to one topic only and also returns the raw rows', async () => {
    const { topicA, topicB } = await seedTopics();
    const uid = userId();
    await SeqProgress.create([
      { userId: uid, course: topicA.course, topicId: topicA.topicId, itemId: 'repo-test-1.1-01', attempts: 2, passedAt: new Date() },
      { userId: uid, course: topicB.course, topicId: topicB.topicId, itemId: 'repo-test-2.1-01', attempts: 1, passedAt: new Date() },
    ]);

    const { passed, rows } = await getProgressByTopic(uid, topicA.topicId);

    expect(passed).toEqual(new Set(['repo-test-1.1-01']));
    expect(rows).toHaveLength(1);
    expect(rows[0].itemId).toBe('repo-test-1.1-01');
  });
});

describe('getCompletedItemCountByTopic', () => {
  it('counts only rows with a passedAt set, scoped to the topic', async () => {
    const { topicA } = await seedTopics();
    const uid = userId();
    await SeqProgress.create([
      { userId: uid, course: topicA.course, topicId: topicA.topicId, itemId: 'repo-test-1.1-01', attempts: 1, passedAt: new Date() },
      { userId: uid, course: topicA.course, topicId: topicA.topicId, itemId: 'repo-test-1.1-02', attempts: 1 }, // attempted, not passed
    ]);

    await expect(getCompletedItemCountByTopic(uid, topicA.topicId)).resolves.toBe(1);
  });
});

describe('recordAttempt', () => {
  it('upserts a new row, incrementing attempts and setting passedAt on a pass', async () => {
    const { topicA, conceptItem } = await seedTopics();
    const uid = userId();

    await recordAttempt({ userId: uid, item: conceptItem, topic: topicA, passed: true, submittedChoice: 'A' });

    const row = await SeqProgress.findOne({ userId: uid, itemId: conceptItem.itemId });
    expect(row).not.toBeNull();
    expect(row!.attempts).toBe(1);
    expect(row!.passedAt).toBeTruthy();
    expect(row!.lastChoice).toBe('A');
    expect(row!.course).toBe(topicA.course);
    expect(row!.topicId).toBe(topicA.topicId);
  });

  it('increments attempts on a repeat submission without touching an unrelated field', async () => {
    const { topicA, conceptItem } = await seedTopics();
    const uid = userId();

    await recordAttempt({ userId: uid, item: conceptItem, topic: topicA, passed: false, submittedChoice: 'B' });
    await recordAttempt({ userId: uid, item: conceptItem, topic: topicA, passed: false, submittedChoice: 'B' });

    const row = await SeqProgress.findOne({ userId: uid, itemId: conceptItem.itemId });
    expect(row!.attempts).toBe(2);
    expect(row!.passedAt).toBeUndefined();
  });

  it('never moves an already-set passedAt backward on a later re-pass', async () => {
    const { topicA, conceptItem } = await seedTopics();
    const uid = userId();

    await recordAttempt({ userId: uid, item: conceptItem, topic: topicA, passed: true, submittedChoice: 'A' });
    const firstRow = await SeqProgress.findOne({ userId: uid, itemId: conceptItem.itemId });
    const originalPassedAt = firstRow!.passedAt!.getTime();

    // Re-pass later, explicitly passing the original passedAt through as
    // existingPassedAt — exactly what seq.controller.ts's submitItem does.
    await recordAttempt({
      userId: uid,
      item: conceptItem,
      topic: topicA,
      passed: true,
      existingPassedAt: firstRow!.passedAt,
      submittedChoice: 'A',
    });

    const secondRow = await SeqProgress.findOne({ userId: uid, itemId: conceptItem.itemId });
    expect(secondRow!.attempts).toBe(2);
    expect(secondRow!.passedAt!.getTime()).toBe(originalPassedAt);
  });

  it('does not set lastChoice for a non-concept item', async () => {
    const { topicA, practicalItem } = await seedTopics();
    const uid = userId();

    await recordAttempt({ userId: uid, item: practicalItem, topic: topicA, passed: true });

    const row = await SeqProgress.findOne({ userId: uid, itemId: practicalItem.itemId });
    expect(row!.lastChoice).toBeUndefined();
    expect(row!.passedAt).toBeTruthy();
  });
});

describe('markTopicSkipped', () => {
  it('upserts every given item as passed+skipped and returns the count marked', async () => {
    const { topicA } = await seedTopics();
    const uid = userId();
    const itemIds = ['repo-test-1.1-01', 'repo-test-1.1-02'];

    const marked = await markTopicSkipped(uid, topicA, itemIds);

    expect(marked).toBe(2);
    const rows = await SeqProgress.find({ userId: uid, topicId: topicA.topicId });
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.passedAt).toBeTruthy();
      expect(row.skipped).toBe(true);
    }
  });

  it('overwrites an existing unpassed row rather than duplicating it', async () => {
    const { topicA } = await seedTopics();
    const uid = userId();
    await SeqProgress.create({ userId: uid, course: topicA.course, topicId: topicA.topicId, itemId: 'repo-test-1.1-01', attempts: 3 });

    await markTopicSkipped(uid, topicA, ['repo-test-1.1-01']);

    const rows = await SeqProgress.find({ userId: uid, itemId: 'repo-test-1.1-01' });
    expect(rows).toHaveLength(1);
    expect(rows[0].attempts).toBe(3); // untouched — only passedAt/skipped are set
    expect(rows[0].skipped).toBe(true);
  });
});

describe('resetTopicProgress', () => {
  it('deletes every row for the given user and topic, and no others', async () => {
    const { topicA, topicB } = await seedTopics();
    const uid = userId();
    const otherUid = userId();
    await SeqProgress.create([
      { userId: uid, course: topicA.course, topicId: topicA.topicId, itemId: 'repo-test-1.1-01', attempts: 1 },
      { userId: uid, course: topicB.course, topicId: topicB.topicId, itemId: 'repo-test-2.1-01', attempts: 1 },
      { userId: otherUid, course: topicA.course, topicId: topicA.topicId, itemId: 'repo-test-1.1-01', attempts: 1 },
    ]);

    await resetTopicProgress(uid, topicA.topicId);

    expect(await SeqProgress.countDocuments({ userId: uid, topicId: topicA.topicId })).toBe(0);
    expect(await SeqProgress.countDocuments({ userId: uid, topicId: topicB.topicId })).toBe(1);
    expect(await SeqProgress.countDocuments({ userId: otherUid, topicId: topicA.topicId })).toBe(1);
  });
});

describe('findAllDistinctProgressKeys / deleteProgressRowsByIds', () => {
  it('lists every row across all users as topicId/itemId pairs, and deletes only the given ids', async () => {
    const { topicA, topicB } = await seedTopics();
    const uidOne = userId();
    const uidTwo = userId();
    await SeqProgress.create([
      { userId: uidOne, course: topicA.course, topicId: topicA.topicId, itemId: 'repo-test-1.1-01', attempts: 1 },
      { userId: uidTwo, course: topicB.course, topicId: topicB.topicId, itemId: 'repo-test-2.1-01', attempts: 1 },
    ]);

    const keys = await findAllDistinctProgressKeys();
    expect(keys).toHaveLength(2);
    expect(keys.map((k) => k.itemId).sort()).toEqual(['repo-test-1.1-01', 'repo-test-2.1-01']);

    const toDelete = keys.filter((k) => k.itemId === 'repo-test-1.1-01').map((k) => k._id);
    const deletedCount = await deleteProgressRowsByIds(toDelete);

    expect(deletedCount).toBe(1);
    expect(await SeqProgress.countDocuments({})).toBe(1);
    expect(await SeqProgress.findOne({ itemId: 'repo-test-2.1-01' })).not.toBeNull();
  });
});
