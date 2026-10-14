import { IPracticeAssignment } from '../models/PracticeAssignment';
import { IPracticeAttempt } from '../models/PracticeAttempt';
import { advancedById, foundationById, SCOPES } from './catalog';

// The only projections of practice data that leave the server toward a
// learner. Deliberately allow-listed field by field: the reference solution,
// hidden tests (input, expected output, their files), tutor notes and
// generation metadata are never included.

export function publicAssignment(a: IPracticeAssignment) {
  return {
    id: a.id as string,
    contentVersion: a.contentVersion,
    language: a.language,
    mode: a.mode,
    scope: a.scope,
    scopeLabel: SCOPES[a.scope].label,
    title: a.title,
    scenario: a.scenario,
    goal: a.goal,
    requirements: a.requirements,
    deliverables: a.deliverables,
    inputSpec: a.inputSpec,
    outputSpec: a.outputSpec,
    constraints: a.constraints,
    acceptanceCriteria: a.acceptanceCriteria,
    samples: a.samples,
    starterCode: a.starterCode,
    fixtures: a.fixtures.map((f) => ({ path: f.path, content: f.content })),
    visibleTests: a.tests
      .filter((t) => t.visible)
      .map((t) => ({
        name: t.name,
        input: t.input,
        expectedOutput: t.expectedOutput,
        expectedFiles: t.expectedFiles.map((f) => ({ path: f.path, content: f.content })),
      })),
    hiddenTestCount: a.tests.filter((t) => !t.visible).length,
    rubric: a.rubric.map((r) => ({ id: r.id, kind: r.kind, description: r.description, conceptId: r.conceptId })),
    concepts: a.advancedConceptIds.map((id) => ({ id, name: advancedById(a.language, id)?.name ?? id })),
    foundation: a.foundationConceptIds.map((id) => ({ id, name: foundationById(a.language, id)?.name ?? id })),
  };
}

export function publicAttempt(t: IPracticeAttempt) {
  return {
    id: t.id as string,
    assignmentId: t.assignmentId.toString(),
    language: t.language,
    mode: t.mode,
    scope: t.scope,
    concepts: t.advancedConceptIds.map((id) => ({ id, name: advancedById(t.language, id)?.name ?? id })),
    status: t.status,
    replay: t.replay,
    code: t.code,
    lastRun: t.lastRun
      ? {
          ranAt: t.lastRun.ranAt,
          allTestsPassed: t.lastRun.allTestsPassed,
          passedCount: t.lastRun.passedCount,
          totalCount: t.lastRun.totalCount,
          compileError: t.lastRun.compileError,
          stderr: t.lastRun.stderr,
          tests: t.lastRun.tests,
          evidence: t.lastRun.evidence,
          completedThisRun: t.lastRun.completedThisRun,
        }
      : null,
    runCount: t.runCount,
    tutorSessionId: t.tutorSessionId ?? null,
    github: t.github?.url ? { url: t.github.url, commitUrl: t.github.commitUrl, repoName: t.github.repoName } : null,
    startedAt: t.startedAt,
    updatedAt: t.updatedAt,
    completedAt: t.completedAt ?? null,
  };
}

/** A compact row for the "unfinished work" list. */
export function attemptSummary(t: IPracticeAttempt, title: string) {
  return {
    id: t.id as string,
    title,
    language: t.language,
    mode: t.mode,
    scope: t.scope,
    concepts: t.advancedConceptIds.map((id) => ({ id, name: advancedById(t.language, id)?.name ?? id })),
    status: t.status,
    replay: t.replay,
    passedCount: t.lastRun?.passedCount ?? null,
    totalCount: t.lastRun?.totalCount ?? null,
    updatedAt: t.updatedAt,
  };
}
