// Canonical "are these two program outputs equal" comparator, used by every
// language runner (python/typescript/cpp). Previously each runner carried an
// independently copy-pasted `stdout.trim() === expectedOutput.trim()` line —
// three places that could silently drift out of sync (and already had:
// runProcess.ts normalizes \r\n on the captured stdout, but none of the
// runners normalized it on the expectedOutput side, so a test case authored
// or edited with literal CRLF line endings would fail a correct submission).
// This is now the single definition of "equal" for exact-output grading.
export function normalizeOutput(text: string): string {
  return text.replace(/\r\n/g, '\n').trim();
}

export function outputsMatch(actual: string, expected: string): boolean {
  return normalizeOutput(actual) === normalizeOutput(expected);
}
