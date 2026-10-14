// Real integration-style test: a real ephemeral mongod (mongodb-memory-server
// — same mechanism as the other real-DB suites in this repo). Module 2 code
// review, databases finding: "progress rows can survive curriculum content
// re-imports with no referential-integrity check." Simulates the actual
// mechanism that causes this — seqCurriculum.import.ts's wholesale
// lessons/checkpoint field replacement via findOneAndUpdate, keyed by a
// stable topicId — by directly mutating a topic's content after progress
// rows already reference its old shape, exactly like a re-import with
// renamed/removed content would.
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { SeqTopic } from '../../models/SeqTopic';
import { SeqProgress } from '../../models/SeqProgress';
import { findOrphanedProgressRows } from '../seqProgressIntegrity.service';

let mem: MongoMemoryServer;

beforeAll(async () => {
  mem = await MongoMemoryServer.create({ instance: { dbName: 'seq_progress_integrity_test' } });
  await mongoose.connect(mem.getUri('seq_progress_integrity_test'));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mem.stop();
});

afterEach(async () => {
  await SeqTopic.deleteMany({});
  await SeqProgress.deleteMany({});
});

function userId(): string {
  return new mongoose.Types.ObjectId().toString();
}

async function seedTopicWithTwoItems() {
  return SeqTopic.create({
    topicId: 'integrity-test-topic',
    course: 'python',
    section: 'foundations',
    topicNumber: 1,
    order: 1,
    title: 'Integrity Test Topic',
    slug: 'integrity-test-topic',
    overview: 'fixture',
    lessons: [
      {
        lessonId: 'integrity-test-1.1',
        number: '1.1',
        title: 'Lesson 1.1',
        items: [
          {
            itemId: 'integrity-test-1.1-01',
            type: 'concept',
            title: 'Item A',
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
            itemId: 'integrity-test-1.1-02',
            type: 'practical',
            title: 'Item B',
            do: 'do it',
            solution: 'print(1)',
            evaluator: 'browser-exec',
            expectExactOutput: '1',
          },
        ],
      },
    ],
    checkpoint: null,
  });
}

describe('findOrphanedProgressRows', () => {
  it('reports no orphans when every row resolves to a real, currently-live item', async () => {
    const topic = await seedTopicWithTwoItems();
    await SeqProgress.create({
      userId: userId(),
      course: topic.course,
      topicId: topic.topicId,
      itemId: 'integrity-test-1.1-01',
      attempts: 1,
    });

    const orphans = await findOrphanedProgressRows();
    expect(orphans).toEqual([]);
  });

  it("flags a row as 'unknown-item' when its item was renamed/removed within an existing topic", async () => {
    const topic = await seedTopicWithTwoItems();
    const uid = userId();
    await SeqProgress.create({
      userId: uid,
      course: topic.course,
      topicId: topic.topicId,
      itemId: 'integrity-test-1.1-02',
      attempts: 1,
      passedAt: new Date(),
    });

    // Simulate a re-import: seqCurriculum.import.ts's own wholesale
    // lessons/checkpoint field replacement via findOneAndUpdate, renaming
    // integrity-test-1.1-02 to a new id exactly as a real content edit
    // would, with no awareness of the existing SeqProgress row.
    await SeqTopic.findOneAndUpdate(
      { topicId: topic.topicId },
      {
        lessons: [
          {
            lessonId: 'integrity-test-1.1',
            number: '1.1',
            title: 'Lesson 1.1',
            items: [
              topic.lessons[0].items[0],
              {
                itemId: 'integrity-test-1.1-02-renamed',
                type: 'practical',
                title: 'Item B (renamed)',
                do: 'do it',
                solution: 'print(1)',
                evaluator: 'browser-exec',
                expectExactOutput: '1',
              },
            ],
          },
        ],
      }
    );

    const orphans = await findOrphanedProgressRows();
    expect(orphans).toHaveLength(1);
    expect(orphans[0].reason).toBe('unknown-item');
    expect(orphans[0].itemId).toBe('integrity-test-1.1-02');
    expect(orphans[0].topicId).toBe(topic.topicId);
  });

  it("flags a row as 'unknown-topic' when its topicId no longer resolves to any SeqTopic", async () => {
    await SeqProgress.create({
      userId: userId(),
      course: 'python',
      topicId: 'a-topic-that-was-deleted',
      itemId: 'some-item',
      attempts: 1,
    });

    const orphans = await findOrphanedProgressRows();
    expect(orphans).toHaveLength(1);
    expect(orphans[0].reason).toBe('unknown-topic');
    expect(orphans[0].topicId).toBe('a-topic-that-was-deleted');
  });

  it('never flags a row referencing the topic checkpoint', async () => {
    const topic = await SeqTopic.create({
      topicId: 'integrity-test-topic-cp',
      course: 'python',
      section: 'foundations',
      topicNumber: 2,
      order: 2,
      title: 'Checkpoint Topic',
      slug: 'checkpoint-topic',
      overview: 'fixture',
      lessons: [
        {
          lessonId: 'integrity-test-cp-1.1',
          number: '1.1',
          title: 'Lesson 1.1',
          items: [
            {
              itemId: 'integrity-test-cp-1.1-01',
              type: 'concept',
              title: 'Item A',
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
      checkpoint: {
        itemId: 'integrity-test-cp-checkpoint',
        type: 'checkpoint',
        title: 'Checkpoint',
        do: 'finish it',
        solution: 'print(1)',
        evaluator: 'browser-exec',
        expectExactOutput: '1',
      },
    });
    await SeqProgress.create({
      userId: userId(),
      course: topic.course,
      topicId: topic.topicId,
      itemId: 'integrity-test-cp-checkpoint',
      attempts: 1,
      passedAt: new Date(),
    });

    const orphans = await findOrphanedProgressRows();
    expect(orphans).toEqual([]);
  });

  it('reports one row per progress row, not deduplicated across users', async () => {
    const topic = await seedTopicWithTwoItems();
    await SeqProgress.create([
      { userId: userId(), course: topic.course, topicId: topic.topicId, itemId: 'no-longer-real', attempts: 1 },
      { userId: userId(), course: topic.course, topicId: topic.topicId, itemId: 'no-longer-real', attempts: 1 },
    ]);

    const orphans = await findOrphanedProgressRows();
    expect(orphans).toHaveLength(2);
    expect(orphans.every((o) => o.itemId === 'no-longer-real')).toBe(true);
  });
});
