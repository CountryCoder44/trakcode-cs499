import type { ExecutionLanguage } from '../api/types';

// Fed to ErrorPanel.tsx (bottom, persistent panel — "structured, highlighted
// errors" per the dockable-layout plan). Line numbers are always best-effort:
// every parse path below falls back to `line: null` rather than guessing, and
// the UI simply omits the "jump to line" affordance when null.
export interface StructuredError {
  id: string;
  severity: 'compile' | 'runtime' | 'test-failure';
  message: string;
  detail?: string;
  line: number | null;
}

interface ParseErrorsInput {
  compileError: string | null;
  stderr: string;
  testResults?: { passed: boolean; actualOutput: string; expectedOutput: string }[];
  language: ExecutionLanguage;
}

// Fed to ExecutionConsolePopup.tsx (transient overlay shown fresh on every
// Run — "full raw execution output as a console" per the dockable-layout
// plan), distinct in purpose from StructuredError above.
export interface ExecutionConsoleData {
  ranAt: string;
  compileError: string | null;
  stderr: string;
  testBlocks?: { label: string; input?: string; actualOutput: string; expectedOutput: string; passed: boolean }[];
  stdout?: string;
}

function lastNonEmptyLine(text: string): string {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  return lines[lines.length - 1] ?? text.trim();
}

// g++'s own error format: `solution.cpp:23:5: error: ...`. The filename is a
// randomized temp path (see services/execution-sandbox), so this only
// anchors on the trailing `:line:col:` pattern, never the path itself.
function parseCompileErrorLine(compileError: string): number | null {
  const m = /:(\d+):(\d+):\s*error:/.exec(compileError);
  if (m) return Number(m[1]);
  // javac has no column: `Main.java:3: error: ...`
  const j = /\.java:(\d+):\s*error:/.exec(compileError);
  return j ? Number(j[1]) : null;
}

// Python tracebacks list every frame as `File "...", line N`; the sandbox
// only ever runs one file (solution.py), so the last (innermost) match is
// the relevant one. TypeScript is transpiled to `solution.js` before it runs,
// so a runtime Node stack trace reads `at ... (.../solution.js:N:C)` — the
// first (topmost) frame is where it actually threw; the line refers to the
// transpiled JS, which esbuild keeps close to the source for type-only TS.
// C++ runtime crashes (a signal/non-zero exit from a compiled binary) carry
// no source line info at all — always null, not a gap to work around.
function parseStderrLine(stderr: string, language: ExecutionLanguage): number | null {
  if (language === 'python') {
    let match: RegExpExecArray | null = null;
    let current: RegExpExecArray | null;
    const re = /File "[^"]*", line (\d+)/g;
    while ((current = re.exec(stderr))) match = current;
    return match ? Number(match[1]) : null;
  }
  if (language === 'typescript') {
    const m = /:(\d+):(\d+)\)?$/m.exec(stderr);
    return m ? Number(m[1]) : null;
  }
  if (language === 'java') {
    // First frame of a Java stack trace: `at Main.main(Main.java:5)`
    const m = /\(\w+\.java:(\d+)\)/.exec(stderr);
    return m ? Number(m[1]) : null;
  }
  return null;
}

export function parseErrors(input: ParseErrorsInput): StructuredError[] {
  const errors: StructuredError[] = [];

  if (input.compileError) {
    errors.push({
      id: 'compile',
      severity: 'compile',
      message: lastNonEmptyLine(input.compileError),
      detail: input.compileError,
      line: parseCompileErrorLine(input.compileError),
    });
  }

  if (input.stderr) {
    errors.push({
      id: 'runtime',
      severity: 'runtime',
      message: lastNonEmptyLine(input.stderr),
      detail: input.stderr,
      line: parseStderrLine(input.stderr, input.language),
    });
  }

  // If compilation failed outright, testResults (if present at all) carries
  // nothing meaningful to report — the compile error above already explains
  // why nothing ran.
  if (input.testResults && !input.compileError) {
    input.testResults.forEach((t, i) => {
      if (t.passed) return;
      errors.push({
        id: `test-${i}`,
        severity: 'test-failure',
        message: `Test ${i + 1}: expected "${t.expectedOutput}", got "${t.actualOutput}"`,
        line: null,
      });
    });
  }

  return errors;
}
