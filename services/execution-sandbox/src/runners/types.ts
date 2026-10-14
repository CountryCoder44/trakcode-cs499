// Mirrors spec §4's request/response contract exactly.
export interface FixtureFile {
  path: string; // relative to the program's working directory
  content: string;
}

export interface TestCase {
  input: string;
  expectedOutput: string;
  // Extra files for this case only (on top of RunOptions.files), e.g. a
  // different data file per hidden test.
  files?: FixtureFile[];
  // Files the program must leave behind, compared like stdout.
  expectedFiles?: FixtureFile[];
}

export interface FileCheck {
  path: string;
  passed: boolean;
  actualContent: string | null; // null when the file was never written
}

export interface TestResult {
  passed: boolean;
  actualOutput: string;
  expectedOutput: string;
  timeMs: number;
  fileChecks?: FileCheck[];
}

export interface RunOptions {
  code: string;
  testCases: TestCase[];
  timeoutMs: number;
  // TypeScript only: run a strict `tsc --noEmit` gate before executing, and
  // fail with the diagnostics (as `compileError`) if it does not pass. Ignored
  // by the Python and C++ runners. See runners/typeCheck.ts.
  strictTypeCheck?: boolean;
  // Fixture files written into the working directory before every test case
  // (data files, a provided helper module, a mock API). When any fixtures or
  // file checks are present, each test case runs in its own fresh directory so
  // files one case writes can't leak into the next.
  files?: FixtureFile[];
}

export interface RunnerResult {
  results: TestResult[];
  allPassed: boolean;
  stderr: string;
  compileError: string | null;
}

export type Runner = (opts: RunOptions) => Promise<RunnerResult>;
