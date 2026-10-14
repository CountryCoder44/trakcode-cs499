// Mirrors spec §4's request/response contract exactly.
export interface TestCase {
  input: string;
  expectedOutput: string;
}

export interface TestResult {
  passed: boolean;
  actualOutput: string;
  expectedOutput: string;
  timeMs: number;
}

export interface RunOptions {
  code: string;
  testCases: TestCase[];
  timeoutMs: number;
  // TypeScript only: run a strict `tsc --noEmit` gate before executing, and
  // fail with the diagnostics (as `compileError`) if it does not pass. Ignored
  // by the Python and C++ runners. See runners/typeCheck.ts.
  strictTypeCheck?: boolean;
}

export interface RunnerResult {
  results: TestResult[];
  allPassed: boolean;
  stderr: string;
  compileError: string | null;
}

export type Runner = (opts: RunOptions) => Promise<RunnerResult>;
