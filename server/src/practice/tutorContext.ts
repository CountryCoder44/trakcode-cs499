import type { StuckSignal, TutorContext, TutorMemorySnapshot } from '../services/tutorContext.service';
import { PracticeAttempt } from '../models/PracticeAttempt';
import { PracticeAssignment } from '../models/PracticeAssignment';
import { NotFoundError } from '../errors/AppError';
import { SCOPES, advancedById, foundationById } from './catalog';

// Trak's context for a long-form practice assignment: the full learner-visible
// brief, the mode and required concepts, the learner's latest run, and the
// private tutor notes written at generation time. The reference solution is
// never put in the prompt. The full test list (hidden ones included) is only
// handed to the guardrail's sandbox check, never shown to the model.

const list = (items: string[]) => items.map((i) => `- ${i}`);

export async function buildPracticeAttemptContext(
  userId: string,
  attemptId: string,
  liveEditorCode: string | undefined,
  shared: { memory: TutorMemorySnapshot; stuckSignal: StuckSignal; curriculumOutline: string }
): Promise<TutorContext> {
  const attempt = await PracticeAttempt.findOne({ _id: attemptId, userId });
  if (!attempt) throw new NotFoundError('Practice attempt not found for this tutor session');
  const a = await PracticeAssignment.findById(attempt.assignmentId);
  if (!a) throw new NotFoundError('Practice assignment not found for this tutor session');

  const lines: string[] = [
    `This is a ${SCOPES[a.scope].label.toLowerCase()} long-form Practice Mode assignment in ${a.language}, mode: ${a.mode === 'stretch' ? 'Stretch out' : 'Practice the basics'}.`,
    '',
    `Scenario: ${a.scenario}`,
    `Goal: ${a.goal}`,
    'Requirements (shown to the learner):',
    ...list(a.requirements),
  ];
  if (a.deliverables.length) lines.push('Deliverables:', ...list(a.deliverables));
  lines.push(`Input: ${a.inputSpec}`, `Output: ${a.outputSpec}`);
  if (a.constraints.length) lines.push('Constraints:', ...list(a.constraints));
  if (a.samples) lines.push('Worked example shown to the learner:', a.samples);
  if (a.fixtures.length) {
    lines.push(`Files provided in the working directory (the learner can read them): ${a.fixtures.map((f) => f.path).join(', ')}.`);
  }
  lines.push(`Basics this assignment builds on: ${a.foundationConceptIds.map((id) => foundationById(a.language, id)?.name ?? id).join(', ') || 'none listed'}.`);
  if (a.advancedConceptIds.length) {
    const concepts = a.advancedConceptIds.map((id) => {
      const c = advancedById(a.language, id);
      return c ? `${c.name} (${c.description})` : id;
    });
    lines.push(`Concepts beyond the basics it requires: ${concepts.join('; ')}.`);
  }

  const notes = a.tutorNotes;
  if (notes && (notes.conceptSupport.length || notes.pitfalls.length || notes.requirementBreakdown.length)) {
    lines.push('', 'PRIVATE notes for you about this assignment. Use them to shape your help; never quote them or hand them over as a list:');
    for (const c of notes.conceptSupport) lines.push(`- ${advancedById(a.language, c.conceptId)?.name ?? c.conceptId}: ${c.notes}`);
    if (notes.pitfalls.length) lines.push('Common pitfalls:', ...list(notes.pitfalls));
    if (notes.requirementBreakdown.length) lines.push('A sensible build order:', ...list(notes.requirementBreakdown));
  }

  const run = attempt.lastRun;
  const progressSummary = run
    ? `Latest run: ${run.passedCount}/${run.totalCount} tests passing${run.compileError ? ', with a compile or syntax error' : ''}; concept checks: ${
        run.evidence.length ? run.evidence.map((e) => `${e.label}: ${e.passed ? 'yes' : 'not yet'}`).join('; ') : 'none required'
      }. Assignment status: ${attempt.status}.`
    : `No runs yet. Assignment status: ${attempt.status}.`;

  let latestResult: string | undefined;
  if (run) {
    const parts: string[] = [];
    if (run.compileError) parts.push(`Compile/syntax error:\n${run.compileError.slice(0, 1500)}`);
    if (run.stderr) parts.push(`stderr:\n${run.stderr.slice(0, 1500)}`);
    for (const t of run.tests.filter((x) => x.visible && !x.passed).slice(0, 2)) {
      parts.push(`Visible test "${t.name}" failed.\nExpected:\n${t.expectedOutput}\nGot:\n${t.actualOutput}`);
    }
    if (run.tests.some((t) => !t.visible && !t.passed)) {
      parts.push('Some hidden tests failed. Their inputs are not shown to the learner or to you.');
    }
    if (!parts.length) parts.push(run.allTestsPassed ? 'Every test passed.' : 'No details.');
    latestResult = parts.join('\n\n');
  }

  return {
    kind: 'practiceAttempt',
    userId,
    title: a.title,
    content: lines.join('\n'),
    stack: a.language,
    liveEditorCode,
    // The saved code stands in when the editor buffer wasn't sent with this message.
    latestSubmissionCode: liveEditorCode ? undefined : attempt.code,
    latestSubmissionResult: latestResult,
    progressSummary,
    problemTestCases: a.tests.map((t) => ({ input: t.input, expectedOutput: t.expectedOutput, files: t.files, expectedFiles: t.expectedFiles })),
    problemFiles: a.fixtures.map((f) => ({ path: f.path, content: f.content })),
    problemLanguage: a.language,
    practiceMode: a.mode,
    ...shared,
  };
}
