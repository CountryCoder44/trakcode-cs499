import { env } from '../config/env';
import { Stack, ExecutionLanguage } from '../types/domain';
import { SandboxUnavailableError } from '../errors/AppError';

// Client for the internal Execution Sandbox service (§4) — the main API's only
// path to real code execution. See services/execution-sandbox/ for the service itself.
export type SandboxLanguage = ExecutionLanguage;

export const stackToLanguage: Record<Stack, SandboxLanguage> = {
  python: 'python',
  typescript: 'typescript',
  cpp: 'cpp',
  java: 'java',
};

export interface ExecFile {
  path: string;
  content: string;
}

export interface ExecTestCase {
  input: string;
  expectedOutput: string;
  files?: ExecFile[]; // fixtures for this case only
  expectedFiles?: ExecFile[]; // files the program must write
}

export interface ExecFileCheck {
  path: string;
  passed: boolean;
  actualContent: string | null;
}

export interface ExecTestResult {
  passed: boolean;
  actualOutput: string;
  expectedOutput: string;
  timeMs: number;
  fileChecks?: ExecFileCheck[];
}

export interface ExecuteResponse {
  results: ExecTestResult[];
  allPassed: boolean;
  stderr: string;
  compileError: string | null;
}

export interface ExecuteOptions {
  timeoutMs?: number;
  // TypeScript only: have the sandbox run a strict `tsc --noEmit` gate before
  // executing and fail with the diagnostics if it does not pass. No effect for
  // other languages.
  strictTypeCheck?: boolean;
  // Fixture files written into the program's working directory before every
  // test case (data files, a provided helper module, a mock API).
  files?: ExecFile[];
}

export async function executeCode(
  language: SandboxLanguage,
  code: string,
  testCases: ExecTestCase[],
  opts: ExecuteOptions = {}
): Promise<ExecuteResponse> {
  if (!env.EXECUTION_SERVICE_URL) {
    throw new SandboxUnavailableError('EXECUTION_SERVICE_URL is not configured');
  }

  const { timeoutMs = 5000, strictTypeCheck, files } = opts;

  const res = await fetch(`${env.EXECUTION_SERVICE_URL}/internal/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language,
      code,
      testCases,
      timeoutMs,
      ...(strictTypeCheck ? { strictTypeCheck: true } : {}),
      ...(files?.length ? { files } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new SandboxUnavailableError(`Execution sandbox returned ${res.status}: ${body}`);
  }

  return (await res.json()) as ExecuteResponse;
}
