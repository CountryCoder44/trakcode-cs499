// Real integration-style test: a real ephemeral mongod (mongodb-memory-server
// — the same mechanism server/src/__tests__/seq.submit.integration.test.ts
// and server/src/config/db.ts both use), exercising findOrGenerateProblem's
// bank-selection query directly rather than through the HTTP layer, since
// this is a service-level concern. Module 2 code review, algorithms/data
// structures finding: "the bank lookup has arbitrary selection order."
// generateValidatedProblem is mocked — no real AI_API_KEY or sandbox is
// available in this suite, and the fall-through-to-generation path is a
// pre-existing, unrelated behavior this change doesn't touch.
//
// Note on tie-breaking, found while writing these tests (not by inspection):
// a "many candidates tied at the same timesServed" scenario does NOT stay
// bounded to a fixed pool of BANK_SELECTION_POOL_SIZE across repeated
// trials — because findOrGenerateProblem increments the picked doc's
// timesServed immediately after selection, ties are self-correcting. Each
// pick nudges one candidate out of the "least served" tier, which pulls the
// next-most-underserved tied candidate into the pool on the following call.
// Over enough trials this rotates through the whole tied group rather than
// favoring a fixed 5 forever — a real, desirable fairness property, just
// not the "never returns a problem outside the least-served pool" boundary
// (tested below with a deliberately large, unclosable timesServed gap
// instead of a tie, where that boundary genuinely is fixed).
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

jest.mock('../problemGeneration.service', () => ({
  generateValidatedProblem: jest.fn(),
}));

import { Problem, IProblem } from '../../models/Problem';
import { UserProblemHistory } from '../../models/UserProblemHistory';
import { User } from '../../models/User';
import { findOrGenerateProblem } from '../problemBank.service';
import { generateValidatedProblem } from '../problemGeneration.service';

let mem: MongoMemoryServer;

beforeAll(async () => {
  mem = await MongoMemoryServer.create({ instance: { dbName: 'problem_bank_test' } });
  await mongoose.connect(mem.getUri('problem_bank_test'));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mem.stop();
});

afterEach(async () => {
  await Problem.deleteMany({});
  await UserProblemHistory.deleteMany({});
  await User.deleteMany({});
  jest.clearAllMocks();
});

let hashCounter = 0;
function baseProblem(overrides: Partial<IProblem> = {}) {
  return {
    stack: 'python' as const,
    topic: 'loops',
    difficulty: 'medium' as const,
    type: 'deep_dive' as const,
    prompt: 'Write a function.',
    starterCode: '',
    testCases: [],
    referenceSolution: 'def f(): pass',
    validated: true,
    tags: [],
    contentHash: `hash-${hashCounter++}`,
    timesServed: 0,
    ...overrides,
  };
}

// A real member account: generating a new question checks the learner's
// allowance (usageLimits.service.ts), which needs an account to look up.
async function freshUserId() {
  const user = await User.create({ email: `u${Math.random()}@example.com`, name: 'U', subscriptionStatus: 'active' });
  return user.id as string;
}

describe('findOrGenerateProblem — bank selection', () => {
  it('never returns a problem outside the least-served pool', async () => {
    // 5 in-pool candidates (timesServed 0..4) plus one far outside the pool
    // (1000 — comfortably out of reach of what 20 trials' worth of +1
    // increments to the in-pool docs could ever close). BANK_SELECTION_POOL_SIZE
    // is 5, so the outlier must never be picked, no matter how many trials run.
    const docs = await Problem.create([
      ...Array.from({ length: 5 }, (_, i) => baseProblem({ timesServed: i })),
      baseProblem({ timesServed: 1000 }),
    ]);
    const heaviest = docs[5];

    for (let i = 0; i < 20; i++) {
      const result = await findOrGenerateProblem({
        userId: await freshUserId(),
        stack: 'python',
        topic: 'loops',
        difficulty: 'medium',
        type: 'deep_dive',
      });
      expect(result._id.toString()).not.toBe(heaviest._id.toString());
    }
  });

  it('produces more than one distinct problem across many trials (real variety, not always-the-same)', async () => {
    await Problem.create(Array.from({ length: 5 }, () => baseProblem({ timesServed: 0 })));

    const seen = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const result = await findOrGenerateProblem({
        userId: await freshUserId(),
        stack: 'python',
        topic: 'loops',
        difficulty: 'medium',
        type: 'deep_dive',
      });
      seen.add(result._id.toString());
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it('increments timesServed on whichever problem is actually picked', async () => {
    const [doc] = await Problem.create([baseProblem({ timesServed: 0 })]);

    const result = await findOrGenerateProblem({
      userId: await freshUserId(),
      stack: 'python',
      topic: 'loops',
      difficulty: 'medium',
      type: 'deep_dive',
    });

    expect(result._id.toString()).toBe(doc._id.toString());
    const reloaded = await Problem.findById(doc._id);
    expect(reloaded!.timesServed).toBe(1);
  });

  it('never returns a problem this user has already been served', async () => {
    // A single call, deliberately — findOrGenerateProblem itself marks
    // whatever it returns as newly "seen" for this user (the existing
    // UserProblemHistory upsert at the end of the function), so a second
    // call with only 2 candidate problems seeded would legitimately have
    // nothing left to return and fall through to generation. One call is
    // sufficient to prove the pre-existing seenProblem was excluded.
    const [seenProblem, freshProblem] = await Problem.create([
      baseProblem({ timesServed: 0 }),
      baseProblem({ timesServed: 0 }),
    ]);
    const userId = await freshUserId();
    await UserProblemHistory.create({ userId, problemId: seenProblem._id, status: 'assigned' });

    const result = await findOrGenerateProblem({
      userId,
      stack: 'python',
      topic: 'loops',
      difficulty: 'medium',
      type: 'deep_dive',
    });
    expect(result._id.toString()).toBe(freshProblem._id.toString());
  });

  it('respects the requiredTopicNumber ceiling', async () => {
    const [inScope, outOfScope] = await Problem.create([
      baseProblem({ requiredTopicNumber: 2 }),
      baseProblem({ requiredTopicNumber: 5 }),
    ]);

    for (let i = 0; i < 10; i++) {
      const result = await findOrGenerateProblem({
        userId: await freshUserId(),
        stack: 'python',
        difficulty: 'medium',
        type: 'deep_dive',
        requiredTopicNumber: 3,
      });
      expect(result._id.toString()).toBe(inScope._id.toString());
      expect(result._id.toString()).not.toBe(outOfScope._id.toString());
    }
  });

  it('falls through to generation when nothing in the bank matches', async () => {
    const generated = { _id: new mongoose.Types.ObjectId() } as unknown as IProblem;
    (generateValidatedProblem as jest.Mock).mockResolvedValue(generated);

    const result = await findOrGenerateProblem({
      userId: await freshUserId(),
      stack: 'python',
      topic: 'a-topic-nothing-matches',
      difficulty: 'medium',
      type: 'deep_dive',
    });

    expect(generateValidatedProblem).toHaveBeenCalledTimes(1);
    expect(result).toBe(generated);
  });
});

// Module 2 code review, databases finding: the "already seen" exclusion
// used to load a user's ENTIRE UserProblemHistory into Node to build a
// `$nin` array. Replaced with a $lookup-based anti-join that runs inside
// Mongo. These tests exercise that specifically — a history far larger than
// any reasonable in-memory array, and the atomic $inc that came with it.
describe('findOrGenerateProblem — bounded anti-join', () => {
  it('correctly excludes every problem in a large seen history, not just a handful', async () => {
    // 300 already-seen problems (an unbounded $nin array would have had to
    // carry all 300 ids) plus exactly one the user has never been served.
    const docs = await Problem.create(Array.from({ length: 301 }, () => baseProblem({ timesServed: 0 })));
    const userId = await freshUserId();
    const seenDocs = docs.slice(1);
    const [unseenDoc] = docs;

    await UserProblemHistory.insertMany(
      seenDocs.map((d) => ({ userId, problemId: d._id, status: 'assigned' as const }))
    );

    for (let i = 0; i < 5; i++) {
      // Re-mark the single unseen doc as unseen again each trial, since the
      // function itself marks its return value as seen at the end.
      await UserProblemHistory.deleteOne({ userId, problemId: unseenDoc._id });
      const result = await findOrGenerateProblem({
        userId,
        stack: 'python',
        topic: 'loops',
        difficulty: 'medium',
        type: 'deep_dive',
      });
      expect(result._id.toString()).toBe(unseenDoc._id.toString());
    }
  });

  it('never re-serves a problem once every bank candidate has been seen, falling through to generation instead', async () => {
    const [only] = await Problem.create([baseProblem({ timesServed: 0 })]);
    const userId = await freshUserId();
    await UserProblemHistory.create({ userId, problemId: only._id, status: 'assigned' });

    const generated = { _id: new mongoose.Types.ObjectId() } as unknown as IProblem;
    (generateValidatedProblem as jest.Mock).mockResolvedValue(generated);

    const result = await findOrGenerateProblem({
      userId,
      stack: 'python',
      topic: 'loops',
      difficulty: 'medium',
      type: 'deep_dive',
    });

    expect(generateValidatedProblem).toHaveBeenCalledTimes(1);
    expect(result).toBe(generated);
  });

  it('increments timesServed atomically under concurrent requests for the same problem, losing none', async () => {
    const [doc] = await Problem.create([baseProblem({ timesServed: 0 })]);
    const userIds = await Promise.all(Array.from({ length: 5 }, () => freshUserId()));

    await Promise.all(
      userIds.map((userId) =>
        findOrGenerateProblem({ userId, stack: 'python', topic: 'loops', difficulty: 'medium', type: 'deep_dive' })
      )
    );

    const reloaded = await Problem.findById(doc._id);
    expect(reloaded!.timesServed).toBe(5);
  });
});
