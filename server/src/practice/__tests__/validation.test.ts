import { fakeExecutor, installTestCatalog, restoreCatalog, validDraft, ALL_FOUNDATION } from './helpers';
import { fingerprintOf, validateDraft } from '../validation';
import { GenerationSpec } from '../draft';
import { conceptEvidence, scanConcepts, stripForAnalysis } from '../staticAnalysis';
import { CATALOGS } from '../catalog';

beforeAll(installTestCatalog);
afterAll(restoreCatalog);

const spec: GenerationSpec = {
  language: 'python',
  mode: 'stretch',
  scope: 'small',
  conceptIds: ['alpha', 'beta'],
  permittedFoundationIds: ALL_FOUNDATION,
  avoidTitles: [],
};

async function reasonsFor(draft: unknown, s: GenerationSpec = spec, existing: { title: string; fingerprint: string[] }[] = []) {
  const r = await validateDraft(draft, s, fakeExecutor, existing);
  return r.ok ? [] : r.reasons;
}

describe('validateDraft', () => {
  it('accepts a complete, consistent draft and builds its rubric', async () => {
    const r = await validateDraft(validDraft(spec), spec, fakeExecutor, []);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.rubric.map((x) => x.kind)).toEqual(['test', 'concept', 'concept', 'review']);
    }
  });

  it('rejects a schema-breaking response', async () => {
    expect((await reasonsFor({ title: 'x' }))[0]).toMatch(/schema/);
  });

  it('rejects declared concepts that differ from the request', async () => {
    const reasons = await reasonsFor(validDraft(spec, { advancedConceptIds: ['alpha'] }));
    expect(reasons.join(' ')).toMatch(/advancedConceptIds must be exactly \[alpha, beta\]/);
  });

  it('rejects a reference solution that quietly needs an extra advanced concept', async () => {
    const draft = validDraft(spec, { referenceSolution: '# SOLVED\nalpha(1)\nbeta(2)\neps(3)' });
    expect((await reasonsFor(draft)).join(' ')).toMatch(/beyond what was requested: Epsilon/);
  });

  it('rejects a reference solution that never uses a required concept', async () => {
    const draft = validDraft(spec, { referenceSolution: '# SOLVED\nalpha(1)' });
    expect((await reasonsFor(draft)).join(' ')).toMatch(/doesn't visibly use: Beta/);
  });

  it('rejects basics the learner has not covered', async () => {
    const narrow = { ...spec, conceptIds: [], mode: 'basics' as const, permittedFoundationIds: ['out', 'input'] };
    const draft = validDraft(narrow, { referenceSolution: '# SOLVED\nfor x in y:\n    print(x)' });
    expect((await reasonsFor(draft, narrow)).join(' ')).toMatch(/basics this learner hasn't covered: loops/);
  });

  it('rejects starter code that already does the work', async () => {
    const usesConcept = validDraft(spec, { starterCode: 'alpha(1)' });
    expect((await reasonsFor(usesConcept)).join(' ')).toMatch(/starter code already uses alpha/);
    const passes = validDraft(spec, { starterCode: '# SOLVED by the starter' });
    expect((await reasonsFor(passes)).join(' ')).toMatch(/starter code already passes every test/);
    const big = validDraft(spec, { starterCode: Array.from({ length: 30 }, (_, i) => `x${i} = ${i}`).join('\n') });
    expect((await reasonsFor(big)).join(' ')).toMatch(/too complete/);
  });

  it('enforces scope sizes and hidden tests', async () => {
    const draft = validDraft(spec);
    const tooFew = { ...draft, requirements: ['only one'] };
    expect((await reasonsFor(tooFew)).join(' ')).toMatch(/needs 2-4 requirements/);
    const noHidden = { ...draft, tests: draft.tests.map((t) => ({ ...t, visible: true })) };
    expect((await reasonsFor(noHidden)).join(' ')).toMatch(/hidden tests/);
    const large = { ...spec, scope: 'large' as const };
    expect((await reasonsFor(validDraft(spec), large)).join(' ')).toMatch(/needs 6-12 requirements/);
  });

  it('rejects a reference solution that fails its own tests', async () => {
    const draft = validDraft(spec, { referenceSolution: 'alpha(1)\nbeta(2)' });
    expect((await reasonsFor(draft)).join(' ')).toMatch(/tests failed against the reference solution/);
  });

  it('rejects near-duplicates of existing assignments, including trivial rewordings', async () => {
    const draft = validDraft(spec);
    const existing = [{ title: 'Old one', fingerprint: fingerprintOf({ ...draft, title: `${draft.title} (v2)` }) }];
    expect((await reasonsFor(draft, spec, existing)).join(' ')).toMatch(/too close to an existing assignment/);
  });
});

describe('static analysis', () => {
  it('ignores words inside strings and comments', () => {
    const code = 'print("alpha(1) inside a string")\n# beta(2) in a comment\nvalue = 3';
    expect(scanConcepts(code, 'python').advanced).toEqual([]);
    expect(conceptEvidence('alpha(1)', 'python', ['alpha'])[0].passed).toBe(true);
  });

  it('keeps import lines intact so module names still count', () => {
    expect(stripForAnalysis('import "mock_api"\nx = "hi"', 'typescript')).toContain('mock_api');
  });

  it('real catalog evidence: Python file I/O and a recursive function', () => {
    const py = CATALOGS.python;
    restoreCatalog();
    try {
      expect(conceptEvidence('with open("data.txt") as f:\n    rows = f.read()', 'python', ['file-io'])[0].passed).toBe(true);
      expect(conceptEvidence('def fact(n):\n    return 1 if n < 2 else n * fact(n - 1)', 'python', ['recursion'])[0].passed).toBe(true);
      expect(conceptEvidence('def fact(n):\n    return n', 'python', ['recursion'])[0].passed).toBe(false);
    } finally {
      CATALOGS.python = py;
    }
  });
});
