jest.mock('../executionClient', () => ({
  executeCode: jest.fn(),
}));

import { gradeConcept, gradeCode } from '../seqGrader';
import { executeCode } from '../executionClient';
import { SeqItem } from '../../models/SeqTopic';

function conceptItem(overrides: Partial<SeqItem> = {}): SeqItem {
  return {
    itemId: 'py-2.1-01',
    type: 'concept',
    title: 'test concept',
    answer: 'B',
    rationale: 'because B is right',
    ifIncorrect: 'try again',
    ...overrides,
  };
}

describe('gradeConcept', () => {
  it('passes a single-answer question when the given letter matches', () => {
    const result = gradeConcept(conceptItem({ answer: 'B' }), 'B');
    expect(result.passed).toBe(true);
    expect(result.rationale).toBe('because B is right');
  });

  it('fails a single-answer question on the wrong letter', () => {
    const result = gradeConcept(conceptItem({ answer: 'B' }), 'A');
    expect(result.passed).toBe(false);
    expect(result.ifIncorrect).toBe('try again');
  });

  it('is order-independent for multi-answer questions', () => {
    const result = gradeConcept(conceptItem({ answer: 'A,C' }), 'C,A');
    expect(result.passed).toBe(true);
  });

  it('fails a multi-answer question when only a subset is selected', () => {
    const result = gradeConcept(conceptItem({ answer: 'A,C' }), 'A');
    expect(result.passed).toBe(false);
  });

  it('fails a multi-answer question when an extra, wrong letter is included', () => {
    const result = gradeConcept(conceptItem({ answer: 'A,C' }), 'A,B,C');
    expect(result.passed).toBe(false);
  });

  it('normalizes case and whitespace in the submitted choice', () => {
    const result = gradeConcept(conceptItem({ answer: 'A,C' }), 'c, a');
    expect(result.passed).toBe(true);
  });

  it('never passes an empty submission', () => {
    const result = gradeConcept(conceptItem({ answer: 'A' }), '');
    expect(result.passed).toBe(false);
  });
});

// nearMissHint itself now lives in nearMissHint.ts with its own dedicated
// test suite (__tests__/nearMissHint.test.ts) — the rule table, language
// gating, and priority ordering are tested there directly. What belongs
// here is gradeCode's own wiring: does it actually reach nearMissHint with
// the right arguments in both the cases it needs to.
describe('gradeCode hint wiring', () => {
  const practicalItem: SeqItem = {
    itemId: 'ts-9.1-01',
    type: 'practical',
    title: 'print a name',
    expectExactOutput: 'Denver',
  };

  afterEach(() => jest.clearAllMocks());

  it('checks nearMissHint against the failing test case when tests actually ran', async () => {
    (executeCode as jest.Mock).mockResolvedValue({
      results: [{ passed: false, actualOutput: 'denver', expectedOutput: 'Denver', timeMs: 1 }],
      allPassed: false,
      stderr: '',
      compileError: null,
    });

    const result = await gradeCode(practicalItem, 'print("denver")', 'python');

    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/capitalization/i);
  });

  it('still checks nearMissHint on a pure compile-time failure, where tests is empty (Correction A)', async () => {
    // Every runner returns results:[] alongside a compileError — before the
    // fix, `tests.find(t => !t.passed)` was always undefined here, so
    // nearMissHint was never called at all on a TypeScript/C++ compile
    // error, no matter how good its rule table was.
    (executeCode as jest.Mock).mockResolvedValue({
      results: [],
      allPassed: false,
      stderr: '',
      compileError: "solution.ts(1,14): error TS2304: Cannot find name 'Denver'.",
    });

    const result = await gradeCode(practicalItem, 'const city = Denver;\nconsole.log(city);', 'typescript');

    expect(result.passed).toBe(false);
    expect(result.hint).toMatch(/quotation marks/i);
  });

  it('leaves hint undefined on a compile error the rule table has no opinion on', async () => {
    (executeCode as jest.Mock).mockResolvedValue({
      results: [],
      allPassed: false,
      stderr: '',
      compileError: "solution.ts(2,10): error TS2322: Type 'number' is not assignable to type 'string'.",
    });

    const result = await gradeCode(practicalItem, 'const city: string = 5;', 'typescript');

    expect(result.passed).toBe(false);
    expect(result.hint).toBeUndefined();
  });
});
