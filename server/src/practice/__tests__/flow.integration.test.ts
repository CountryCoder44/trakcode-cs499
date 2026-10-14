import request from 'supertest';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../../app';
import { UsageEvent } from '../../models/UsageEvent';
import { User } from '../../models/User';
import { signToken } from '../../utils/jwt';
import { PracticeAssignment } from '../../models/PracticeAssignment';
import { PracticeAttempt } from '../../models/PracticeAttempt';
import { PracticeGenerationJob } from '../../models/PracticeGenerationJob';
import { setPracticeDeps } from '../deps';
import { waitForJob } from '../jobs';
import { fakeExecutor, fakeGenerator, installTestCatalog, restoreCatalog, seedAssignment, validDraft } from './helpers';
import { PRACTICE_MAX_GENERATION_ATTEMPTS } from '../../config/constants';

// End to end through the real Express app and a real mongod, with a fake
// generator (no model tokens) and a fake sandbox.

let mem: MongoMemoryServer;
const app = createApp();

beforeAll(async () => {
  installTestCatalog();
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri('practice_flow'));
  await Promise.all([PracticeAssignment.syncIndexes(), PracticeAttempt.syncIndexes(), PracticeGenerationJob.syncIndexes()]);
});
afterAll(async () => {
  restoreCatalog();
  setPracticeDeps();
  await mongoose.disconnect();
  await mem.stop();
});
beforeEach(async () => {
  await Promise.all([User.deleteMany({}), PracticeAssignment.deleteMany({}), PracticeAttempt.deleteMany({}), PracticeGenerationJob.deleteMany({})]);
  setPracticeDeps({ executor: fakeExecutor, generator: fakeGenerator().generator });
});

async function learner() {
  const user = await User.create({ email: `l${crypto.randomUUID()}@example.com`, name: 'L', subscriptionStatus: 'active' });
  return `Bearer ${signToken({ userId: user.id, role: 'user' })}`;
}

const rid = () => crypto.randomUUID();
const start = (auth: string, body: Record<string, unknown>) =>
  request(app).post('/api/practice/assignments/start').set('Authorization', auth).send({ requestId: rid(), language: 'python', scope: 'small', ...body });

async function settle(auth: string, res: request.Response) {
  if (res.body.status !== 'pending') return res.body;
  await waitForJob(res.body.jobId);
  return (await request(app).get(`/api/practice/jobs/${res.body.jobId}`).set('Authorization', auth)).body;
}

describe('Practice the basics, end to end', () => {
  it('a library entry is built from its brief once, then reused instantly for the next learner', async () => {
    const gen = fakeGenerator();
    setPracticeDeps({ generator: gen.generator });
    const libStart = (auth: string) =>
      request(app).post('/api/practice/library/py-001/start').set('Authorization', auth).send({ requestId: rid() });

    const ada = await learner();
    const first = await libStart(ada);
    expect(first.status).toBe(202);
    const ready = await settle(ada, first);
    expect(ready.status).toBe('ready');
    expect(gen.calls).toHaveLength(1);
    expect(gen.calls[0].spec.brief?.title).toBe('Tip Calculator');

    const bob = await learner();
    const reused = await libStart(bob);
    expect(reused.status).toBe(201);
    expect(reused.body.assignment.id).toBe(ready.assignment.id);
    expect(gen.calls).toHaveLength(1);

    const list = await request(app).get('/api/practice/library?language=python').set('Authorization', bob);
    const item = list.body.items.find((x: { id: string }) => x.id === 'py-001');
    expect(item).toMatchObject({ ready: true, status: 'in_progress', mode: 'basics' });
    expect(list.body.items).toHaveLength(100);
  });

  it('counts a new assignment toward the monthly allowance, and refuses once it is used up (bank reuse stays free)', async () => {
    const gen = fakeGenerator();
    setPracticeDeps({ generator: gen.generator });
    const user = await User.create({ email: `l${crypto.randomUUID()}@example.com`, name: 'L', subscriptionStatus: 'active' });
    const auth = `Bearer ${signToken({ userId: user.id, role: 'user' })}`;

    const ready = await settle(auth, await start(auth, { mode: 'basics' }));
    expect(ready.status).toBe('ready');
    expect(await UsageEvent.countDocuments({ userId: user._id, kind: 'practice-generation' })).toBe(1);

    // Use up the rest of the month's 20, then ask for something the bank doesn't have.
    await UsageEvent.insertMany(Array.from({ length: 19 }, () => ({ userId: user._id, kind: 'practice-generation' })));
    const refused = await start(auth, { mode: 'basics', scope: 'medium', intent: 'new' });
    expect(refused.status).toBe(429);
    expect(refused.body.details.code).toBe('PRACTICE_LIMIT');
    expect(gen.calls).toHaveLength(1);
  });

  it('generates when the bank is empty, then reuses that assignment for the next learner without generating', async () => {
    const gen = fakeGenerator();
    setPracticeDeps({ generator: gen.generator });

    const ada = await learner();
    const first = await start(ada, { mode: 'basics' });
    expect(first.status).toBe(202);
    expect(first.body.status).toBe('pending');
    const ready = await settle(ada, first);
    expect(ready.status).toBe('ready');
    expect(gen.calls).toHaveLength(1);
    expect(ready.assignment.mode).toBe('basics');
    expect(ready.assignment.concepts).toEqual([]);

    const bob = await learner();
    const reused = await start(bob, { mode: 'basics' });
    expect(reused.status).toBe(201);
    expect(reused.body.status).toBe('ready');
    expect(reused.body.assignment.id).toBe(ready.assignment.id);
    expect(gen.calls).toHaveLength(1); // no second generation, no AI call to choose
  });

  it('a failing run saves progress but does not complete; passing tests do', async () => {
    await seedAssignment();
    const auth = await learner();
    const { attempt } = (await start(auth, { mode: 'basics' })).body;

    const fail = await request(app).post(`/api/practice/attempts/${attempt.id}/run`).set('Authorization', auth).send({ code: 'print("hi")' });
    expect(fail.body.attempt.status).toBe('in_progress');
    expect(fail.body.attempt.code).toBe('print("hi")');
    expect(fail.body.attempt.lastRun.passedCount).toBe(0);
    // Hidden tests only report pass/fail.
    const hidden = fail.body.attempt.lastRun.tests.find((t: { visible: boolean }) => !t.visible);
    expect(hidden).toEqual({ name: 'secret one', visible: false, passed: false });

    const pass = await request(app).post(`/api/practice/attempts/${attempt.id}/run`).set('Authorization', auth).send({ code: '# SOLVED' });
    expect(pass.body.attempt.status).toBe('completed');
    expect(pass.body.attempt.completedAt).toBeTruthy();
  });

  it('never exposes the reference solution, hidden tests or tutor notes', async () => {
    await seedAssignment();
    const auth = await learner();
    const started = await start(auth, { mode: 'basics' });
    const got = await request(app).get(`/api/practice/attempts/${started.body.attempt.id}`).set('Authorization', auth);
    for (const body of [started.body, got.body]) {
      const text = JSON.stringify(body);
      expect(text).not.toContain('PRIVATE-REFERENCE-SOLUTION');
      expect(text).not.toContain('SECRET-INPUT-42');
      expect(text).not.toContain('SECRET-OUTPUT-42');
      expect(text).not.toContain('PRIVATE-PITFALL');
    }
    expect(got.body.assignment.hiddenTestCount).toBe(1);
  });

  it("keeps another learner out of someone else's attempt", async () => {
    await seedAssignment();
    const owner = await learner();
    const { attempt } = (await start(owner, { mode: 'basics' })).body;
    const stranger = await learner();
    expect((await request(app).get(`/api/practice/attempts/${attempt.id}`).set('Authorization', stranger)).status).toBe(404);
  });
});

describe('Stretch out, end to end', () => {
  it('generates with the named concept plus compatible fillers, exactly the count asked for', async () => {
    const gen = fakeGenerator();
    setPracticeDeps({ generator: gen.generator });
    const auth = await learner();
    const res = await settle(auth, await start(auth, { mode: 'stretch', conceptCount: 3, conceptIds: ['alpha'] }));
    expect(res.status).toBe('ready');
    const ids = res.assignment.concepts.map((c: { id: string }) => c.id);
    expect(ids).toHaveLength(3);
    expect(ids).toContain('alpha');
    expect(ids).not.toContain('delta');
    expect(gen.calls[0].spec.conceptIds.sort()).toEqual([...ids].sort());
    expect(res.assignment.rubric.filter((r: { kind: string }) => r.kind === 'concept')).toHaveLength(3);
  });

  it('completion needs the concept code checks, not just passing output', async () => {
    await seedAssignment({ advancedConceptIds: ['alpha'], mode: 'stretch' });
    const auth = await learner();
    const { attempt } = (await start(auth, { mode: 'stretch', conceptCount: 1, conceptIds: ['alpha'] })).body;
    const noConcept = await request(app).post(`/api/practice/attempts/${attempt.id}/run`).set('Authorization', auth).send({ code: '# SOLVED' });
    expect(noConcept.body.attempt.lastRun.allTestsPassed).toBe(true);
    expect(noConcept.body.attempt.status).toBe('in_progress');
    expect(noConcept.body.attempt.lastRun.evidence).toEqual([{ conceptId: 'alpha', label: 'uses alpha', passed: false }]);
    const withConcept = await request(app).post(`/api/practice/attempts/${attempt.id}/run`).set('Authorization', auth).send({ code: '# SOLVED\nalpha(3)' });
    expect(withConcept.body.attempt.status).toBe('completed');
  });

  it('explains a conflicting request before doing anything, and generates nothing', async () => {
    const gen = fakeGenerator();
    setPracticeDeps({ generator: gen.generator });
    const auth = await learner();
    const res = await start(auth, { mode: 'stretch', conceptCount: 1, conceptIds: ['alpha', 'beta'] });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('conflict');
    expect(res.body.conflict.code).toBe('too-many-concepts');
    expect(gen.calls).toHaveLength(0);
    expect(await PracticeGenerationJob.countDocuments()).toBe(0);
  });
});

describe('coordination and idempotency', () => {
  it('equivalent concurrent requests share one generation job but get separate attempts', async () => {
    // Hold generation open until both requests are in, so the second one
    // really meets a running job (otherwise a fast fake can finish first).
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const gen = fakeGenerator();
    setPracticeDeps({
      generator: { generate: async (spec, feedback) => (await gate, gen.generator.generate(spec, feedback)) },
    });
    const [a, b] = [await learner(), await learner()];
    const [ra, rb] = await Promise.all([start(a, { mode: 'basics' }), start(b, { mode: 'basics' })]);
    release();
    expect(ra.body.jobId).toBe(rb.body.jobId);
    const [sa, sb] = [await settle(a, ra), await settle(b, rb)];
    expect(gen.calls).toHaveLength(1);
    expect(sa.assignment.id).toBe(sb.assignment.id);
    expect(sa.attempt.id).not.toBe(sb.attempt.id);
  });

  it('a repeated Start (double click, retry, refresh) returns the same attempt', async () => {
    await seedAssignment();
    await seedAssignment();
    const auth = await learner();
    const body = { requestId: rid(), language: 'python', scope: 'small', mode: 'basics' };
    const results = await Promise.all(
      [1, 2, 3].map(() => request(app).post('/api/practice/assignments/start').set('Authorization', auth).send(body))
    );
    const ids = new Set(results.map((r) => r.body.attempt.id));
    expect(ids.size).toBe(1);
    expect(await PracticeAttempt.countDocuments({ status: 'in_progress' })).toBe(1);
    const again = await request(app).post('/api/practice/assignments/start').set('Authorization', auth).send(body);
    expect(again.body.attempt.id).toBe([...ids][0]);
  });

  it('offers Resume when the only fit is in progress, and generates only on an explicit New assignment', async () => {
    const gen = fakeGenerator();
    setPracticeDeps({ generator: gen.generator });
    await seedAssignment();
    const auth = await learner();
    const first = (await start(auth, { mode: 'basics' })).body;
    const second = (await start(auth, { mode: 'basics' })).body;
    expect(second.status).toBe('active_exists');
    expect(second.attempt.id).toBe(first.attempt.id);
    expect(gen.calls).toHaveLength(0);

    const fresh = await settle(auth, await start(auth, { mode: 'basics', intent: 'new' }));
    expect(fresh.status).toBe('ready');
    expect(fresh.assignment.id).not.toBe(first.assignment.id);
    expect(gen.calls).toHaveLength(1);
  });

  it('labels previously abandoned work, and Continue brings back the saved code', async () => {
    const seeded = await seedAssignment();
    const auth = await learner();
    const { attempt } = (await start(auth, { mode: 'basics' })).body;
    await request(app).put(`/api/practice/attempts/${attempt.id}/code`).set('Authorization', auth).send({ code: 'my work' });
    await request(app).post(`/api/practice/attempts/${attempt.id}/abandon`).set('Authorization', auth);

    const again = (await start(auth, { mode: 'basics' })).body;
    expect(again.status).toBe('previously_started');
    expect(again.assignment.id).toBe(seeded.id);
    const reopened = await request(app).post(`/api/practice/attempts/${again.abandonedAttemptId}/reopen`).set('Authorization', auth);
    expect(reopened.body.attempt.status).toBe('in_progress');
    expect(reopened.body.attempt.code).toBe('my work');
  });

  it('a completed assignment is not reissued as new practice', async () => {
    const gen = fakeGenerator();
    setPracticeDeps({ generator: gen.generator });
    await seedAssignment();
    const auth = await learner();
    const { attempt } = (await start(auth, { mode: 'basics' })).body;
    await request(app).post(`/api/practice/attempts/${attempt.id}/run`).set('Authorization', auth).send({ code: '# SOLVED' });
    const next = await settle(auth, await start(auth, { mode: 'basics' }));
    expect(next.assignment.id).not.toBe(attempt.assignmentId);
    expect(gen.calls).toHaveLength(1);
  });
});

describe('generation failures', () => {
  it('stops after the repair budget, publishes nothing, and reports a retryable failure', async () => {
    const gen = fakeGenerator((spec) => validDraft(spec, { referenceSolution: 'no good' }));
    setPracticeDeps({ generator: gen.generator });
    const auth = await learner();
    const res = await settle(auth, await start(auth, { mode: 'basics' }));
    expect(res.status).toBe('failed');
    expect(gen.calls).toHaveLength(PRACTICE_MAX_GENERATION_ATTEMPTS);
    expect(gen.calls[1].feedback?.join(' ')).toMatch(/tests failed/);
    expect(await PracticeAssignment.countDocuments()).toBe(0);
    const job = await PracticeGenerationJob.findOne();
    expect(job?.validationFailures).toHaveLength(PRACTICE_MAX_GENERATION_ATTEMPTS);
    expect(job?.failureCategory).toBe('validation');
  });

  it('repairs within budget: a bad first draft followed by a good one publishes the good one', async () => {
    const gen = fakeGenerator((spec, call) => (call === 1 ? validDraft(spec, { referenceSolution: '# SOLVED\neps(1)' }) : validDraft(spec)));
    setPracticeDeps({ generator: gen.generator });
    const auth = await learner();
    const res = await settle(auth, await start(auth, { mode: 'basics' }));
    expect(res.status).toBe('ready');
    expect(gen.calls).toHaveLength(2);
    expect(gen.calls[1].feedback?.join(' ')).toMatch(/beyond what was requested/);
  });

  it("a worker that dies leaves a lease that expires: the job fails cleanly and a new Start can generate", async () => {
    const auth = await learner();
    const userId = (await User.findOne())!._id;
    const dead = await PracticeGenerationJob.create({
      requestKey: 'stale',
      spec: {},
      status: 'running',
      leaseOwner: 'some-dead-worker',
      leaseExpiresAt: new Date(Date.now() - 1000),
      waiters: [{ userId, requestId: 'old-request', joinedAt: new Date() }],
    });
    const polled = await request(app).get(`/api/practice/jobs/${dead.id}`).set('Authorization', auth);
    expect(polled.body.status).toBe('failed');
    expect((await PracticeGenerationJob.findById(dead.id))?.failureCategory).toBe('lease-expired');

    const fresh = await settle(auth, await start(auth, { mode: 'basics' }));
    expect(fresh.status).toBe('ready');
  });

  it('a stale running job for the same request is replaced rather than waited on forever', async () => {
    const auth = await learner();
    const first = await start(auth, { mode: 'basics' });
    await waitForJob(first.body.jobId);
    await PracticeAssignment.deleteMany({});
    await PracticeGenerationJob.updateOne({ _id: first.body.jobId }, { $set: { status: 'running', leaseExpiresAt: new Date(Date.now() - 1), leaseOwner: 'gone' } });
    const second = await start(auth, { mode: 'basics' });
    expect(second.body.jobId).not.toBe(first.body.jobId);
    expect((await settle(auth, second)).status).toBe('ready');
  });
});
