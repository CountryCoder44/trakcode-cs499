import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ALL_FOUNDATION, installTestCatalog, restoreCatalog, seedAssignment } from './helpers';
import { PracticeAssignment } from '../../models/PracticeAssignment';
import { PracticeAttempt } from '../../models/PracticeAttempt';
import { findEligibleAssignment, findActiveAttemptFor } from '../matching';
import { NormalizedRequest, normalizePracticeRequest, PracticeRequestInput } from '../request';
import { createAttempt } from '../attempts';

let mem: MongoMemoryServer;
const user = new mongoose.Types.ObjectId().toString();
const other = new mongoose.Types.ObjectId().toString();

beforeAll(async () => {
  installTestCatalog();
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri('practice_matching'));
  await Promise.all([PracticeAssignment.syncIndexes(), PracticeAttempt.syncIndexes()]);
});
afterAll(async () => {
  restoreCatalog();
  await mongoose.disconnect();
  await mem.stop();
});
beforeEach(async () => {
  await Promise.all([PracticeAssignment.deleteMany({}), PracticeAttempt.deleteMany({})]);
});

function req(input: Partial<PracticeRequestInput> = {}, foundation = ALL_FOUNDATION): NormalizedRequest {
  const r = normalizePracticeRequest({ language: 'python', mode: 'basics', scope: 'small', ...input } as PracticeRequestInput, foundation);
  if (!r.ok) throw new Error(r.conflict.message);
  return r.request;
}

async function attemptOn(userId: string, assignmentId: mongoose.Types.ObjectId, status: 'in_progress' | 'completed' | 'abandoned') {
  const a = (await PracticeAssignment.findById(assignmentId))!;
  const attempt = await createAttempt(userId, a, { source: 'bank' });
  attempt.status = status;
  await attempt.save();
  return attempt;
}

describe('findEligibleAssignment', () => {
  it('returns an eligible shared assignment', async () => {
    const a = await seedAssignment();
    const m = await findEligibleAssignment(user, req());
    expect(m?.assignment.id).toBe(a.id);
    expect(m?.abandonedAttemptId).toBeUndefined();
  });

  it('skips completed work and picks another eligible item', async () => {
    const done = await seedAssignment();
    const fresh = await seedAssignment();
    await attemptOn(user, done._id, 'completed');
    for (let i = 0; i < 10; i++) expect((await findEligibleAssignment(user, req()))?.assignment.id).toBe(fresh.id);
    // Another learner is unaffected by this learner's history.
    expect(await findEligibleAssignment(other, req())).not.toBeNull();
  });

  it('treats any content version of a completed family as completed', async () => {
    const v1 = await seedAssignment();
    await attemptOn(user, v1._id, 'completed');
    await seedAssignment({ familyId: v1.familyId, contentVersion: 2 });
    expect(await findEligibleAssignment(user, req())).toBeNull();
  });

  it('finds the one eligible item even when many earlier candidates are completed', async () => {
    const completed = await Promise.all(Array.from({ length: 40 }, () => seedAssignment({ timesAssigned: 0 })));
    const eligible = await seedAssignment({ timesAssigned: 500 }); // sorts last
    for (const c of completed) await attemptOn(user, c._id, 'completed');
    expect((await findEligibleAssignment(user, req()))?.assignment.id).toBe(eligible.id);
  });

  it('never offers something already in progress as new work', async () => {
    const a = await seedAssignment();
    await attemptOn(user, a._id, 'in_progress');
    expect(await findEligibleAssignment(user, req())).toBeNull();
    expect((await findActiveAttemptFor(user, req()))?.assignmentId.toString()).toBe(a.id);
  });

  it('reuses abandoned work with a "previously started" marker, but prefers never-started items', async () => {
    const abandoned = await seedAssignment();
    const attempt = await attemptOn(user, abandoned._id, 'abandoned');
    const only = await findEligibleAssignment(user, req());
    expect(only?.assignment.id).toBe(abandoned.id);
    expect(only?.abandonedAttemptId?.toString()).toBe(attempt.id);

    const fresh = await seedAssignment({ timesAssigned: 99 });
    for (let i = 0; i < 10; i++) {
      const m = await findEligibleAssignment(user, req());
      expect(m?.assignment.id).toBe(fresh.id);
      expect(m?.abandonedAttemptId).toBeUndefined();
    }
  });

  it("excludes assignments needing basics outside the learner's list", async () => {
    await seedAssignment({ foundationConceptIds: ['out', 'loops'] });
    expect(await findEligibleAssignment(user, req({}, ['out', 'input', 'cond']))).toBeNull();
    expect(await findEligibleAssignment(user, req({}, ALL_FOUNDATION))).not.toBeNull();
  });

  it('basics requests never get assignments with concepts beyond the basics', async () => {
    await seedAssignment({ advancedConceptIds: ['alpha'], mode: 'basics' });
    expect(await findEligibleAssignment(user, req())).toBeNull();
  });

  it('stretch: exact count, every named concept, no substitutes with extra concepts', async () => {
    const ab = await seedAssignment({ advancedConceptIds: ['alpha', 'beta'] });
    await seedAssignment({ advancedConceptIds: ['beta', 'eps'] });
    await seedAssignment({ advancedConceptIds: ['alpha', 'beta', 'eps'] });
    await seedAssignment({ advancedConceptIds: ['alpha'] });

    // Fully specified: only the exact set.
    const full = req({ mode: 'stretch', conceptCount: 2, conceptIds: ['alpha', 'beta'] });
    for (let i = 0; i < 5; i++) expect((await findEligibleAssignment(user, full))?.assignment.id).toBe(ab.id);
    // Partly specified: contains alpha, exactly 2 total.
    const partial = req({ mode: 'stretch', conceptCount: 2, conceptIds: ['alpha'] });
    for (let i = 0; i < 5; i++) expect((await findEligibleAssignment(user, partial))?.assignment.advancedConceptIds).toEqual(['alpha', 'beta']);
    // Random: any 2-concept assignment, searched before any concept is chosen.
    const random = req({ mode: 'stretch', conceptCount: 2 });
    const seen = new Set<string>();
    for (let i = 0; i < 30; i++) seen.add((await findEligibleAssignment(user, random))!.assignment.advancedConceptIds.join('+'));
    expect([...seen].sort()).toEqual(['alpha+beta', 'beta+eps']);
  });

  it('never matches quarantined or out-of-date assignments', async () => {
    await seedAssignment({ status: 'quarantined' });
    await seedAssignment({ basicsVersion: 'old-version' });
    await seedAssignment({ runtimeVersion: 'old-runtime' });
    expect(await findEligibleAssignment(user, req())).toBeNull();
  });
});
