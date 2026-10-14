import { normalizeOutput, outputsMatch } from '../compareOutput';

describe('outputsMatch', () => {
  it('matches byte-identical output', () => {
    expect(outputsMatch('Ada is 25\n', 'Ada is 25\n')).toBe(true);
  });

  // The real bug this whole module exists to prevent from ever coming back:
  // Windows Python writes internal \r\n between lines, which a bare .trim()
  // (stripping only the string's outer edges) never touches.
  it('matches when actual output has internal Windows-style CRLF line endings', () => {
    const actual = 'line one\r\nline two\r\nline three';
    const expected = 'line one\nline two\nline three';
    expect(outputsMatch(actual, expected)).toBe(true);
  });

  it('matches when the EXPECTED side (not just actual) has CRLF line endings', () => {
    const actual = 'line one\nline two';
    const expected = 'line one\r\nline two';
    expect(outputsMatch(actual, expected)).toBe(true);
  });

  it('ignores a trailing newline difference', () => {
    expect(outputsMatch('Hello, world!\n', 'Hello, world!')).toBe(true);
  });

  it('ignores leading/trailing whitespace padding', () => {
    expect(outputsMatch('  Hello, world!  \n', 'Hello, world!')).toBe(true);
  });

  it('does not ignore internal whitespace differences', () => {
    expect(outputsMatch('Hello,  world!', 'Hello, world!')).toBe(false);
  });

  it('does not match genuinely different output', () => {
    expect(outputsMatch('Goodbye', 'Hello, world!')).toBe(false);
  });

  it('is case-sensitive', () => {
    expect(outputsMatch('hello', 'Hello')).toBe(false);
  });

  it('handles multi-byte Unicode correctly', () => {
    expect(outputsMatch('café — café\r\ndone', 'café — café\ndone')).toBe(true);
    expect(outputsMatch('café', 'cafe')).toBe(false);
  });

  it('handles empty output on both sides', () => {
    expect(outputsMatch('', '')).toBe(true);
    expect(outputsMatch('\r\n', '')).toBe(true);
  });
});

describe('normalizeOutput', () => {
  it('converts CRLF to LF and trims outer whitespace', () => {
    expect(normalizeOutput('  a\r\nb\r\nc  \r\n')).toBe('a\nb\nc');
  });
});
