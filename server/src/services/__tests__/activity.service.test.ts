// Real integration-style test: a real ephemeral mongod (mongodb-memory-server
// — same mechanism as the other real-DB suites in this repo). Covers the
// dashboard bug fix (getLearningHeatmap previously read the dead UserProgress
// model instead of SeqProgress, so it was silently always empty) and the new
// per-kind streak split (a day with only practice activity must not count
// toward the learning streak, and vice versa).
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { SeqTopic } from '../../models/SeqTopic';
import { SeqProgress } from '../../models/SeqProgress';
import { Submission } from '../../models/Submission';
import { Problem } from '../../models/Problem';
import { getLearningHeatmap, getPracticeHeatmap, computeStreak, getActivitySummary } from '../activity.service';

let mem: MongoMemoryServer;

beforeAll(async () => {
  mem = await MongoMemoryServer.create({ instance: { dbName: 'activity_service_test' } });
  await mongoose.connect(mem.getUri('activity_service_test'));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mem.stop();
});

afterEach(async () => {
  await SeqTopic.deleteMany({});
  await SeqProgress.deleteMany({});
  await Submission.deleteMany({});
  await Problem.deleteMany({});
});

function userId(): string {
  return new mongoose.Types.ObjectId().toString();
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}

async function seedTopic() {
  return SeqTopic.create({
    topicId: 'activity-test-topic',
    course: 'python',
    section: 'foundations',
    topicNumber: 2,
    order: 2,
    title: 'Variables & Types',
    slug: 'variables-types',
    overview: 'fixture',
    lessons: [
      {
        lessonId: 'activity-test-2.1',
        number: '2.1',
        title: 'Lesson 2.1',
        items: [
          {
            itemId: 'activity-test-2.1-01',
            type: 'practical',
            title: 'Print your name',
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

describe('getLearningHeatmap', () => {
  it('reads real Learn Mode completions from SeqProgress, not the dead UserProgress model', async () => {
    const topic = await seedTopic();
    const uid = userId();
    await SeqProgress.create({
      userId: uid,
      course: topic.course,
      topicId: topic.topicId,
      itemId: 'activity-test-2.1-01',
      attempts: 1,
      passedAt: daysAgo(1),
    });

    const heatmap = await getLearningHeatmap(uid);
    expect(heatmap).toHaveLength(1);
    expect(heatmap[0].count).toBe(1);
    expect(heatmap[0].items).toEqual(['Variables & Types: Print your name']);
  });

  it('ignores attempted-but-not-passed rows', async () => {
    const topic = await seedTopic();
    const uid = userId();
    await SeqProgress.create({
      userId: uid,
      course: topic.course,
      topicId: topic.topicId,
      itemId: 'activity-test-2.1-01',
      attempts: 1,
    });

    expect(await getLearningHeatmap(uid)).toEqual([]);
  });

  it('buckets multiple same-day passes into one entry with one label per item', async () => {
    const topic = await seedTopic();
    const uid = userId();
    const today = daysAgo(0);
    await SeqProgress.create([
      { userId: uid, course: topic.course, topicId: topic.topicId, itemId: 'activity-test-2.1-01', attempts: 1, passedAt: today },
    ]);
    // A second, different user's pass on the same day must not leak into this user's heatmap.
    await SeqProgress.create({
      userId: userId(),
      course: topic.course,
      topicId: topic.topicId,
      itemId: 'activity-test-2.1-01',
      attempts: 1,
      passedAt: today,
    });

    const heatmap = await getLearningHeatmap(uid);
    expect(heatmap).toHaveLength(1);
    expect(heatmap[0].count).toBe(1);
  });

  it('falls back to the raw itemId when the topic no longer resolves', async () => {
    const uid = userId();
    await SeqProgress.create({
      userId: uid,
      course: 'python',
      topicId: 'deleted-topic',
      itemId: 'some-item',
      attempts: 1,
      passedAt: daysAgo(0),
    });

    const heatmap = await getLearningHeatmap(uid);
    expect(heatmap[0].items).toEqual(['some-item']);
  });
});

describe('getPracticeHeatmap', () => {
  async function seedSubmission(uid: string, result: 'pass' | 'fail', submittedAt: Date) {
    const problem = await Problem.create({
      stack: 'python',
      topic: 'recursion',
      difficulty: 'medium',
      type: 'deep_dive',
      prompt: 'fixture',
      testCases: [],
    });
    return Submission.create({
      userId: uid,
      problemId: problem._id,
      code: 'print(1)',
      language: 'python',
      result,
      submittedAt,
    });
  }

  it('describes each submission by the problem topic/difficulty and result', async () => {
    const uid = userId();
    await seedSubmission(uid, 'pass', daysAgo(1));

    const heatmap = await getPracticeHeatmap(uid);
    expect(heatmap).toHaveLength(1);
    expect(heatmap[0].items).toEqual(['recursion (medium): pass']);
  });

  it('counts every submission as activity, not just passes', async () => {
    const uid = userId();
    const today = daysAgo(0);
    await seedSubmission(uid, 'pass', today);
    await seedSubmission(uid, 'fail', today);

    const heatmap = await getPracticeHeatmap(uid);
    expect(heatmap).toHaveLength(1);
    expect(heatmap[0].count).toBe(2);
  });
});

describe('computeStreak', () => {
  it('is zero with no active days', () => {
    expect(computeStreak(new Set())).toEqual({ currentStreak: 0, longestStreak: 0 });
  });

  it('counts a run ending yesterday as current (today not required)', () => {
    const keys = new Set([daysAgo(1), daysAgo(2), daysAgo(3)].map((d) => d.toISOString().slice(0, 10)));
    expect(computeStreak(keys)).toEqual({ currentStreak: 3, longestStreak: 3 });
  });

  it('resets current streak to 0 once the gap exceeds a day, but keeps the historical longest', () => {
    const keys = new Set(
      [daysAgo(10), daysAgo(11), daysAgo(12), daysAgo(13)].map((d) => d.toISOString().slice(0, 10))
    );
    expect(computeStreak(keys)).toEqual({ currentStreak: 0, longestStreak: 4 });
  });
});

describe('getActivitySummary', () => {
  it('tracks learning and practice streaks independently — a practice-only day never counts toward the learning streak', async () => {
    const topic = await seedTopic();
    const uid = userId();
    const today = daysAgo(0);

    // Learning activity only 3 days ago (a gap since).
    await SeqProgress.create({
      userId: uid,
      course: topic.course,
      topicId: topic.topicId,
      itemId: 'activity-test-2.1-01',
      attempts: 1,
      passedAt: daysAgo(3),
    });
    // Practice activity today and yesterday (an active current streak).
    const problem = await Problem.create({
      stack: 'python',
      topic: 'loops',
      difficulty: 'easy',
      type: 'deep_dive',
      prompt: 'fixture',
      testCases: [],
    });
    await Submission.create([
      { userId: uid, problemId: problem._id, code: 'x', language: 'python', result: 'pass', submittedAt: today },
      { userId: uid, problemId: problem._id, code: 'x', language: 'python', result: 'pass', submittedAt: daysAgo(1) },
    ]);

    const summary = await getActivitySummary(uid);
    expect(summary.learningStreak).toEqual({ currentStreak: 0, longestStreak: 1 });
    expect(summary.practiceStreak).toEqual({ currentStreak: 2, longestStreak: 2 });
    expect(summary.totalLessonsCompleted).toBe(1);
    expect(summary.totalSubmissions).toBe(2);
  });
});
