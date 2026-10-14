import { ALL_FOUNDATION, installTestCatalog, restoreCatalog } from './helpers';
import { normalizePracticeRequest, pickConceptCombination, requestKey, resolveConceptText } from '../request';

beforeAll(installTestCatalog);
afterAll(restoreCatalog);

const base = { language: 'python' as const, scope: 'small' as const };

function ok(input: Parameters<typeof normalizePracticeRequest>[0], defaults = ALL_FOUNDATION) {
  const r = normalizePracticeRequest(input, defaults);
  if (!r.ok) throw new Error(`expected ok, got ${r.conflict.code}: ${r.conflict.message}`);
  return r.request;
}
function conflictOf(input: Parameters<typeof normalizePracticeRequest>[0], defaults = ALL_FOUNDATION) {
  const r = normalizePracticeRequest(input, defaults);
  if (r.ok) throw new Error('expected a conflict');
  return r.conflict;
}

describe('basics mode', () => {
  it('has zero concepts beyond the basics', () => {
    const r = ok({ ...base, mode: 'basics' });
    expect(r.conceptCount).toBe(0);
    expect(r.requiredConceptIds).toEqual([]);
  });

  it('rejects advanced settings instead of ignoring them', () => {
    expect(conflictOf({ ...base, mode: 'basics', conceptCount: 2 }).code).toBe('advanced-in-basics');
    expect(conflictOf({ ...base, mode: 'basics', conceptIds: ['alpha'] }).code).toBe('advanced-in-basics');
  });

  it('explains when the skill list cannot support the scope, and offers what would', () => {
    const c = conflictOf({ ...base, scope: 'medium', mode: 'basics' }, ['out', 'input']);
    expect(c.code).toBe('scope-needs-foundation');
    expect(c.suggestions.map((s) => s.patch)).toEqual(
      expect.arrayContaining([{ scope: 'small' }, { foundationIds: ['cond', 'input', 'loops', 'out'] }])
    );
  });
});

describe('stretch mode', () => {
  it('requires a count of 1 to 3', () => {
    expect(conflictOf({ ...base, mode: 'stretch', conceptCount: 0 }).code).toBe('invalid');
    expect(conflictOf({ ...base, mode: 'stretch', conceptCount: 4 }).code).toBe('invalid');
  });

  it('keeps a named concept mandatory and leaves the other slots open', () => {
    const r = ok({ ...base, mode: 'stretch', conceptCount: 3, conceptIds: ['alpha'] });
    expect(r.conceptCount).toBe(3);
    expect(r.requiredConceptIds).toEqual(['alpha']);
  });

  it('asks to raise the count or drop selections when more are named than the count', () => {
    const c = conflictOf({ ...base, mode: 'stretch', conceptCount: 1, conceptIds: ['alpha', 'beta'] });
    expect(c.code).toBe('too-many-concepts');
    expect(c.suggestions[0].patch).toEqual({ conceptCount: 2 });
  });

  it('counts dependencies: gamma needs beta, so it cannot fit in a count of 1', () => {
    const c = conflictOf({ ...base, mode: 'stretch', conceptCount: 1, conceptIds: ['gamma'] });
    expect(c.code).toBe('dependency-exceeds-count');
    expect(c.suggestions[0].patch).toEqual({ conceptCount: 2 });
    expect(ok({ ...base, mode: 'stretch', conceptCount: 2, conceptIds: ['gamma'] }).requiredConceptIds).toEqual(['beta', 'gamma']);
  });

  it('explains incompatible concepts and offers to keep either one', () => {
    const c = conflictOf({ ...base, mode: 'stretch', conceptCount: 2, conceptIds: ['alpha', 'delta'] });
    expect(c.code).toBe('incompatible-concepts');
    const kept = c.suggestions.map((s) => s.patch.conceptIds);
    expect(kept).toHaveLength(2);
    expect(kept).toEqual(expect.arrayContaining([['alpha'], ['delta']]));
  });

  it('explains when a concept needs a basic skill the learner has unchecked', () => {
    const c = conflictOf({ ...base, mode: 'stretch', conceptCount: 1, conceptIds: ['eps'] }, ['out', 'input', 'cond', 'loops']);
    expect(c.code).toBe('missing-foundation');
    expect(c.suggestions[0].patch.foundationIds).toContain('funcs');
  });

  it('resolves typed names and aliases, and suggests close matches for unknown ones', () => {
    expect(resolveConceptText('python', 'The Alpha Thing, b thing')).toEqual({ ids: ['alpha', 'beta'], unresolved: [] });
    const c = conflictOf({ ...base, mode: 'stretch', conceptCount: 1, conceptText: 'beta stuff please' });
    expect(c.code).toBe('unknown-concept');
    expect(c.suggestions[0].patch.conceptIds).toEqual(['beta']);
  });

  it("refuses a count that the learner's skills can't fill", () => {
    // Only alpha's and delta's prerequisites are allowed, and they're incompatible.
    const c = conflictOf({ ...base, mode: 'stretch', conceptCount: 2 }, ['out', 'input', 'cond']);
    expect(c.code).toBe('no-compatible-combination');
  });
});

describe('concept combinations for generation', () => {
  it('fills the remaining slots with a valid, compatible, dependency-complete set', () => {
    for (let i = 0; i < 25; i++) {
      const combo = pickConceptCombination('python', ['alpha'], 3, ALL_FOUNDATION)!;
      expect(combo).toHaveLength(3);
      expect(combo).toContain('alpha');
      expect(combo).not.toContain('delta'); // incompatible with alpha
      if (combo.includes('gamma')) expect(combo).toContain('beta');
    }
  });
});

describe('request keys', () => {
  it('are equal for equivalent requests and differ when anything material changes', () => {
    const a = ok({ ...base, mode: 'stretch', conceptCount: 2, conceptIds: ['beta', 'alpha'] });
    const b = ok({ ...base, mode: 'stretch', conceptCount: 2, conceptText: 'alpha and beta' });
    expect(requestKey(a)).toBe(requestKey(b));
    const c = ok({ ...base, mode: 'stretch', conceptCount: 2, conceptIds: ['alpha', 'beta'] }, ['out', 'input', 'cond', 'loops']);
    expect(requestKey(c)).not.toBe(requestKey(a));
  });
});
