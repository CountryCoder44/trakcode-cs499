import { CATALOGS, LanguageCatalog, SCOPES } from '../catalog';
import { PracticeAssignment, IPracticeAssignment } from '../../models/PracticeAssignment';
import { BASICS_CURRICULUM_VERSION } from '../catalog';
import { PRACTICE_RUNTIME_VERSION } from '../request';
import { ExecuteResponse, ExecTestCase } from '../../services/executionClient';
import { DraftGenerator, GenerationSpec } from '../draft';

// Shared fixtures for Practice Mode tests. Tests run against a small,
// purpose-built concept catalog (installed over the real Python one) so they
// keep testing the engine's rules even when the real catalog's content changes.

export const TEST_CATALOG: LanguageCatalog = {
  language: 'python',
  label: 'Python',
  fileExtension: 'py',
  foundation: [
    { id: 'out', name: 'Output', description: 'print', detect: [] },
    { id: 'input', name: 'Input', description: 'input()', detect: [/\binput\s*\(/] },
    { id: 'cond', name: 'Conditionals', description: 'if', detect: [/^\s*if\b/m] },
    { id: 'loops', name: 'Loops', description: 'for/while', detect: [/^\s*(for|while)\b/m] },
    { id: 'funcs', name: 'Functions', description: 'def', detect: [/^\s*def\s/m] },
  ],
  advanced: [
    { id: 'alpha', name: 'Alpha', description: 'alpha things', aliases: ['the alpha thing', 'a'], requiresFoundation: ['cond'], requiresAdvanced: [], incompatibleWith: [], evidence: [/\balpha\(/], evidenceLabel: 'uses alpha' },
    { id: 'beta', name: 'Beta', description: 'beta things', aliases: ['b thing'], requiresFoundation: ['loops'], requiresAdvanced: [], incompatibleWith: [], evidence: [/\bbeta\(/], evidenceLabel: 'uses beta' },
    { id: 'gamma', name: 'Gamma', description: 'gamma builds on beta', aliases: [], requiresFoundation: [], requiresAdvanced: ['beta'], incompatibleWith: [], evidence: [/\bgamma\(/], evidenceLabel: 'uses gamma' },
    {
      id: 'delta', name: 'Delta', description: 'delta things', aliases: [], requiresFoundation: [], requiresAdvanced: [],
      incompatibleWith: [{ id: 'alpha', reason: 'they fight' }], evidence: [/\bdelta\(/], evidenceLabel: 'uses delta',
    },
    { id: 'eps', name: 'Epsilon', description: 'needs functions', aliases: [], requiresFoundation: ['funcs'], requiresAdvanced: [], incompatibleWith: [], evidence: [/\beps\(/], evidenceLabel: 'uses eps' },
  ],
  minFoundationForScope: { small: ['out', 'input'], medium: ['out', 'input', 'cond', 'loops'], large: ['out', 'input', 'cond', 'loops', 'funcs'] },
  courseTopicFoundation: {},
  runtimeNotes: 'test runtime',
};

const realPython = CATALOGS.python;
export function installTestCatalog(): void {
  CATALOGS.python = TEST_CATALOG;
}
export function restoreCatalog(): void {
  CATALOGS.python = realPython;
}

export const ALL_FOUNDATION = ['cond', 'funcs', 'input', 'loops', 'out'];

let counter = 0;
const WORDS = ['harbor', 'lantern', 'orchard', 'glacier', 'violin', 'meadow', 'compass', 'quarry', 'saddle', 'thimble', 'walnut', 'zephyr', 'beacon', 'canyon', 'ember', 'falcon', 'garnet', 'hazel', 'island', 'jasper', 'kettle', 'lagoon', 'marble', 'nectar', 'oyster', 'pepper', 'quill', 'raven', 'summit', 'tundra'];

/** A distinct word salad, so generated drafts never look like near-duplicates of each other. */
export function uniqueWords(n = 6): string[] {
  counter++;
  return Array.from({ length: n }, (_, i) => `${WORDS[(counter * 7 + i * 3) % WORDS.length]}${counter}x${i}`);
}

/** A draft that passes every validation check for this spec (with fakeExecutor). */
export function validDraft(spec: GenerationSpec, overrides: Record<string, unknown> = {}) {
  const scope = SCOPES[spec.scope];
  const words = uniqueWords();
  const reqs = Array.from({ length: scope.requirements.min }, (_, i) => `Requirement ${i + 1} about ${words[i % words.length]}`);
  const tests = Array.from({ length: scope.minTests }, (_, i) => ({
    name: `case ${i}`,
    input: `${i}`,
    expectedOutput: `result ${i}`,
    visible: i === 0,
    files: [],
    expectedFiles: [],
  }));
  return {
    title: `Project ${words.join(' ')}`,
    scenario: `A scenario about ${words.join(' ')}.`,
    goal: 'Do the thing.',
    requirements: reqs,
    deliverables: Array.from({ length: scope.minDeliverables }, (_, i) => `deliverable ${i}`),
    inputSpec: 'a number',
    outputSpec: 'a line',
    constraints: [],
    acceptanceCriteria: ['all good'],
    samples: 'in: 0, out: result 0',
    starterCode: '# TODO: write your program',
    fixtures: [],
    tests,
    referenceSolution: ['# SOLVED', ...spec.conceptIds.map((id) => `${id}(1)`)].join('\n'),
    foundationConceptIds: ['out'],
    advancedConceptIds: [...spec.conceptIds],
    reviewCriteria: ['clear names'],
    tutorNotes: { conceptSupport: spec.conceptIds.map((id) => ({ conceptId: id, notes: `help with ${id}` })), pitfalls: ['off by one'], requirementBreakdown: ['start small'] },
    ...overrides,
  };
}

/**
 * Fake sandbox: code containing "SOLVED" prints each test's expected output
 * (and writes its expected files); anything else prints "nope".
 */
export const fakeExecutor = async (_lang: string, code: string, testCases: ExecTestCase[]): Promise<ExecuteResponse> => {
  const solved = code.includes('SOLVED');
  const results = testCases.map((t) => ({
    passed: solved,
    actualOutput: solved ? t.expectedOutput : 'nope',
    expectedOutput: t.expectedOutput,
    timeMs: 1,
    ...(t.expectedFiles?.length ? { fileChecks: t.expectedFiles.map((f) => ({ path: f.path, passed: solved, actualContent: solved ? f.content : null })) } : {}),
  }));
  return { results, allPassed: solved && results.length > 0, stderr: '', compileError: null };
};

/** A generator that records its calls and returns valid drafts (or whatever `make` returns). */
export function fakeGenerator(make: (spec: GenerationSpec, call: number) => unknown = (spec) => validDraft(spec)) {
  const calls: { spec: GenerationSpec; feedback: string[] | null }[] = [];
  const generator: DraftGenerator = {
    async generate(spec, feedback) {
      calls.push({ spec, feedback });
      return { draft: make(spec, calls.length), tokensUsed: 1000 };
    },
  };
  return { generator, calls };
}

/** Insert a published assignment directly (bypassing generation). */
export async function seedAssignment(overrides: Partial<Record<keyof IPracticeAssignment, unknown>> = {}): Promise<IPracticeAssignment> {
  const advanced = (overrides.advancedConceptIds as string[] | undefined) ?? [];
  const words = uniqueWords();
  return PracticeAssignment.create({
    language: 'python',
    mode: advanced.length ? 'stretch' : 'basics',
    scope: 'small',
    foundationConceptIds: ['out'],
    advancedConceptIds: advanced,
    advancedConceptCount: advanced.length,
    basicsVersion: BASICS_CURRICULUM_VERSION,
    runtimeVersion: PRACTICE_RUNTIME_VERSION,
    status: 'published',
    title: `Seeded ${words.join(' ')}`,
    scenario: 'seeded',
    goal: 'seeded',
    requirements: ['r1', 'r2'],
    starterCode: '# TODO',
    tests: [
      { name: 'visible one', input: '1', expectedOutput: 'one', visible: true },
      { name: 'secret one', input: 'SECRET-INPUT-42', expectedOutput: 'SECRET-OUTPUT-42', visible: false },
    ],
    referenceSolution: 'PRIVATE-REFERENCE-SOLUTION SOLVED',
    tutorNotes: { conceptSupport: [], pitfalls: ['PRIVATE-PITFALL'], requirementBreakdown: [] },
    fingerprint: words,
    ...overrides,
  });
}

