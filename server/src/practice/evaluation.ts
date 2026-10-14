import { IPracticeAssignment } from '../models/PracticeAssignment';
import { IAttemptRun } from '../models/PracticeAttempt';
import { practiceDeps } from './deps';
import { conceptEvidence } from './staticAnalysis';

// Runs a learner's code against an assignment's tests (visible and hidden) in
// the real sandbox, plus one code check per required advanced concept.
// Completion needs both: every test passing AND every concept check passing,
// because passing output alone doesn't show the required concept was used.
// Hidden tests only ever report pass/fail back to the learner.

const MAX_STDERR = 4000;

export async function evaluateCode(assignment: IPracticeAssignment, code: string): Promise<IAttemptRun> {
  const { executor } = practiceDeps();
  const tests = assignment.tests.map((t) => ({
    input: t.input,
    expectedOutput: t.expectedOutput,
    files: t.files,
    expectedFiles: t.expectedFiles,
  }));
  const result = await executor(assignment.language, code.trim() ? code : ' ', tests, {
    timeoutMs: 5000,
    files: assignment.fixtures,
  });

  const testResults = assignment.tests.map((t, i) => {
    const r = result.results[i];
    const passed = Boolean(r?.passed);
    return t.visible
      ? {
          name: t.name,
          visible: true,
          passed,
          input: t.input,
          expectedOutput: t.expectedOutput,
          actualOutput: r?.actualOutput ?? '',
          ...(r?.fileChecks ? { fileChecks: r.fileChecks.map((c) => ({ path: c.path, passed: c.passed })) } : {}),
        }
      : { name: t.name, visible: false, passed };
  });

  const passedCount = testResults.filter((t) => t.passed).length;
  const allTestsPassed = !result.compileError && testResults.length > 0 && passedCount === testResults.length;
  const evidence = conceptEvidence(code, assignment.language, assignment.advancedConceptIds);

  return {
    ranAt: new Date(),
    allTestsPassed,
    passedCount,
    totalCount: testResults.length,
    compileError: result.compileError,
    stderr: (result.stderr ?? '').slice(0, MAX_STDERR),
    tests: testResults,
    evidence,
    completedThisRun: allTestsPassed && evidence.every((e) => e.passed),
  };
}
