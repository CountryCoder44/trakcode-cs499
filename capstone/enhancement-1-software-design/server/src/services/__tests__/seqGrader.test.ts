import { gradeConcept, nearMissHint } from '../seqGrader';
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

describe('nearMissHint', () => {
  it('returns undefined for an exact match (no hint needed)', () => {
    expect(nearMissHint('Hello, world!', 'Hello, world!', '', 'print("Hello, world!")')).toBeUndefined();
  });

  it('returns undefined for a genuinely different answer', () => {
    expect(nearMissHint('Goodbye', 'Hello, world!', '', 'print("Goodbye")')).toBeUndefined();
  });

  it('flags capitalization-only differences', () => {
    const hint = nearMissHint('hello, world!', 'Hello, World!', '', 'print("hello, world!")');
    expect(hint).toMatch(/capitalization/i);
  });

  it('flags whitespace-only differences', () => {
    const hint = nearMissHint('Hello   world', 'Hello world', '', 'print("Hello   world")');
    expect(hint).toMatch(/spacing/i);
  });

  it('flags a missing trailing punctuation mark', () => {
    const hint = nearMissHint('Total: 15', 'Total: 15.', '', 'print("Total: 15")');
    expect(hint).toMatch(/end/i);
  });

  it('flags a NameError caused by a missing string literal quotes', () => {
    const err = "NameError: name 'Denver' is not defined";
    const hint = nearMissHint('', 'Denver', err, 'city = Denver\nprint(city)');
    expect(hint).toMatch(/quotation marks/i);
  });

  it('flags an unterminated string literal', () => {
    const err = 'SyntaxError: unterminated string literal';
    const hint = nearMissHint('', 'Denver', err, 'print("Denver)');
    expect(hint).toMatch(/closing quotation mark/i);
  });

  it('flags two statements jammed onto one line', () => {
    const err = 'SyntaxError: invalid syntax';
    const code = 'print("a") print("b")';
    const hint = nearMissHint('', 'a\nb', err, code);
    expect(hint).toMatch(/two statements/i);
  });

  it('flags a missing comma between print arguments', () => {
    const err = 'SyntaxError: invalid syntax. Perhaps you forgot a comma?';
    const code = 'print("Total:" 15)';
    const hint = nearMissHint('', 'Total: 15', err, code);
    expect(hint).toMatch(/comma/i);
  });
});
