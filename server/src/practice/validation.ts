import { executeCode } from '../services/executionClient';
import { SCOPES, advancedById, catalogFor } from './catalog';
import { AssignmentDraft, GenerationSpec, assignmentDraftSchema } from './draft';
import { conceptEvidence, scanConcepts, significantLines } from './staticAnalysis';
import { foundationNeededBy } from './request';
import { IRubricItem } from '../models/PracticeAssignment';

// Validation for a generated draft, before anything is published or assigned.
// Every check here is deterministic. Reasons are written so they can be fed
// straight back to the generator as repair instructions.
//
// What this can and can't prove, stated plainly:
//   - Execution checks are real: the reference solution must pass every test
//     in the actual sandbox, and the starter must not.
//   - Concept checks are code heuristics (staticAnalysis.ts): they catch a
//     reference solution that uses an undeclared concept or skips a required
//     one, but they are not a proof.
//   - Coherence and usefulness of the scenario are not machine-checked beyond
//     structure and size limits.

const STARTER_MAX_SHARE = 0.35;
const STARTER_MIN_ALLOWANCE = 12;
export const NEAR_DUPLICATE_THRESHOLD = 0.6;

const STOPWORDS = new Set(
  'a an and are as at be by each for from has have if in into is it its of on or so that the their them then this to was were will with you your program should must print prints line lines input output value values number numbers'.split(' ')
);

/** Word set used for near-duplicate detection. */
export function fingerprintOf(draft: Pick<AssignmentDraft, 'title' | 'scenario' | 'requirements'>): string[] {
  const text = [draft.title, draft.scenario, ...draft.requirements].join(' ').toLowerCase();
  return [...new Set(text.match(/[a-z][a-z0-9]{2,}/g) ?? [])].filter((w) => !STOPWORDS.has(w)).sort();
}

export function similarity(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const setB = new Set(b);
  const inter = a.filter((w) => setB.has(w)).length;
  return inter / (a.length + b.length - inter);
}

export interface ExistingAssignmentSummary {
  title: string;
  fingerprint: string[];
}

export type ValidationResult =
  | { ok: true; draft: AssignmentDraft; fingerprint: string[]; rubric: IRubricItem[] }
  | { ok: false; reasons: string[] };

export function buildRubric(draft: AssignmentDraft, spec: GenerationSpec): IRubricItem[] {
  const total = draft.tests.length;
  return [
    { id: 'tests', kind: 'test', description: `All ${total} tests pass (checked by running your program, including hidden tests)` },
    ...spec.conceptIds.map((id) => ({
      id: `concept:${id}`,
      kind: 'concept' as const,
      conceptId: id,
      description: `${advancedById(spec.language, id)?.evidenceLabel ?? id} (a code check)`,
    })),
    ...draft.reviewCriteria.map((text, i) => ({ id: `review:${i + 1}`, kind: 'review' as const, description: text })),
  ];
}

export async function validateDraft(
  raw: unknown,
  spec: GenerationSpec,
  executor: typeof executeCode,
  existing: ExistingAssignmentSummary[]
): Promise<ValidationResult> {
  const parsed = assignmentDraftSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, reasons: [`The response did not match the assignment schema: ${parsed.error.issues.slice(0, 5).map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`] };
  }
  const draft = parsed.data;
  const reasons: string[] = [];
  const cat = catalogFor(spec.language);
  const scope = SCOPES[spec.scope];

  // ---- Metadata consistency ----
  const declaredAdvanced = [...new Set(draft.advancedConceptIds)].sort();
  const wantedAdvanced = [...spec.conceptIds].sort();
  if (declaredAdvanced.join(',') !== wantedAdvanced.join(',')) {
    reasons.push(`advancedConceptIds must be exactly [${wantedAdvanced.join(', ')}] but was [${declaredAdvanced.join(', ')}].`);
  }
  const knownFoundation = cat.foundation.map((f) => f.id);
  const unknownFoundation = draft.foundationConceptIds.filter((id) => !knownFoundation.includes(id));
  if (unknownFoundation.length) reasons.push(`Unknown foundation concept ids: ${unknownFoundation.join(', ')}.`);
  const disallowedFoundation = draft.foundationConceptIds.filter((id) => knownFoundation.includes(id) && !spec.permittedFoundationIds.includes(id));
  if (disallowedFoundation.length) reasons.push(`The assignment relies on basics this learner hasn't covered: ${disallowedFoundation.join(', ')}. Remove that dependency.`);

  // ---- Scope ----
  if (draft.requirements.length < scope.requirements.min || draft.requirements.length > scope.requirements.max) {
    reasons.push(`A ${scope.label.toLowerCase()} assignment needs ${scope.requirements.min}-${scope.requirements.max} requirements; this has ${draft.requirements.length}.`);
  }
  if (draft.deliverables.length < scope.minDeliverables) {
    reasons.push(`A ${scope.label.toLowerCase()} assignment needs at least ${scope.minDeliverables} connected deliverables; this has ${draft.deliverables.length}.`);
  }
  const visible = draft.tests.filter((t) => t.visible).length;
  const hidden = draft.tests.length - visible;
  if (draft.tests.length < scope.minTests) reasons.push(`Needs at least ${scope.minTests} tests; has ${draft.tests.length}.`);
  if (visible < 1) reasons.push('Needs at least one visible test.');
  if (hidden < scope.minHiddenTests) reasons.push(`Needs at least ${scope.minHiddenTests} hidden tests; has ${hidden}.`);
  const outputs = new Set(draft.tests.map((t) => t.expectedOutput.trim()));
  if (draft.tests.length >= 3 && outputs.size < 2) reasons.push('Every test expects the same output, so a hardcoded print would pass. Vary the data.');

  // ---- Concepts the reference solution actually uses (heuristic) ----
  const scan = scanConcepts(draft.referenceSolution, spec.language);
  const extraAdvanced = scan.advanced.filter((id) => !spec.conceptIds.includes(id));
  if (extraAdvanced.length) {
    reasons.push(`The reference solution uses concepts beyond what was requested: ${extraAdvanced.map((id) => advancedById(spec.language, id)?.name ?? id).join(', ')}. Rewrite it without them.`);
  }
  const extraFoundation = scan.foundation.filter((id) => !spec.permittedFoundationIds.includes(id));
  if (extraFoundation.length) {
    reasons.push(`The reference solution uses basics this learner hasn't covered: ${extraFoundation.join(', ')}. Rewrite it without them.`);
  }
  const missingEvidence = conceptEvidence(draft.referenceSolution, spec.language, spec.conceptIds).filter((e) => !e.passed);
  if (missingEvidence.length) {
    reasons.push(`The reference solution doesn't visibly use: ${missingEvidence.map((e) => advancedById(spec.language, e.conceptId)?.name ?? e.conceptId).join(', ')}. Each required concept must be essential.`);
  }
  const prereqsMissing = foundationNeededBy(spec.language, spec.conceptIds).filter((f) => !spec.permittedFoundationIds.includes(f));
  if (prereqsMissing.length) reasons.push(`Required concepts depend on uncovered basics: ${prereqsMissing.join(', ')}.`);

  // ---- Minimal scaffolding ----
  const starterEvidence = conceptEvidence(draft.starterCode, spec.language, spec.conceptIds).filter((e) => e.passed);
  if (starterEvidence.length) {
    reasons.push(`The starter code already uses ${starterEvidence.map((e) => e.conceptId).join(', ')}. Leave that for the learner.`);
  }
  const refLines = significantLines(draft.referenceSolution, spec.language);
  const starterLines = significantLines(draft.starterCode, spec.language);
  if (starterLines > Math.max(STARTER_MIN_ALLOWANCE, Math.round(refLines * STARTER_MAX_SHARE))) {
    reasons.push(`The starter code is too complete (${starterLines} lines against a ${refLines}-line solution). Keep only imports, an entry point and TODOs.`);
  }

  // ---- Near-duplicates of what's already in the bank ----
  const fingerprint = fingerprintOf(draft);
  const dup = existing.find((e) => similarity(fingerprint, e.fingerprint) >= NEAR_DUPLICATE_THRESHOLD);
  if (dup) reasons.push(`This is too close to an existing assignment ("${dup.title}"). Use a different scenario and requirements.`);

  // Structural problems first: no point spending sandbox time on a draft that
  // has to be regenerated anyway.
  if (reasons.length) return { ok: false, reasons };

  // ---- Real execution ----
  const tests = draft.tests.map((t) => ({ input: t.input, expectedOutput: t.expectedOutput, files: t.files, expectedFiles: t.expectedFiles }));
  try {
    const ref = await executor(spec.language, draft.referenceSolution, tests, { timeoutMs: 8000, files: draft.fixtures });
    if (ref.compileError) {
      reasons.push(`The reference solution failed to compile: ${ref.compileError.slice(0, 500)}`);
    } else if (!ref.allPassed) {
      const failed = ref.results.map((r, i) => ({ r, t: draft.tests[i] })).filter(({ r }) => !r.passed);
      const first = failed[0];
      const fileNote = first.r.fileChecks?.find((c) => !c.passed);
      reasons.push(
        `${failed.length}/${ref.results.length} tests failed against the reference solution. First failure ("${first.t.name}"): ` +
          (fileNote
            ? `file ${fileNote.path} was ${fileNote.actualContent === null ? 'never written' : 'different from expected'}.`
            : `expected "${first.r.expectedOutput.slice(0, 200)}", got "${first.r.actualOutput.slice(0, 200)}".`) +
          (ref.stderr ? ` stderr: ${ref.stderr.slice(0, 300)}` : '')
      );
    }
    if (!reasons.length) {
      const starter = await executor(spec.language, draft.starterCode.trim() ? draft.starterCode : ' ', tests, { timeoutMs: 5000, files: draft.fixtures });
      if (!starter.compileError && starter.allPassed) reasons.push('The starter code already passes every test. It must leave the work to the learner.');
    }
  } catch (err) {
    reasons.push(`Sandbox run failed: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (reasons.length) return { ok: false, reasons };

  return { ok: true, draft, fingerprint, rubric: buildRubric(draft, spec) };
}
