import { env } from '../config/env';
import { Stack, ExecutionLanguage } from '../types/domain';

// Client for the internal Execution Sandbox service (§4) — the main API's only
// path to real code execution. See services/execution-sandbox/ for the service itself.
export type SandboxLanguage = ExecutionLanguage;

export const stackToLanguage: Record<Stack, SandboxLanguage> = {
  python: 'python',
  mern: 'javascript',
  cpp: 'cpp',
};

export interface ExecTestCase {
  input: string;
  expectedOutput: string;
}

export interface ExecTestResult {
  passed: boolean;
  actualOutput: string;
  expectedOutput: string;
  timeMs: number;
}

export interface ExecuteResponse {
  results: ExecTestResult[];
  allPassed: boolean;
  stderr: string;
  compileError: string | null;
}

export async function executeCode(
  language: SandboxLanguage,
  code: string,
  testCases: ExecTestCase[],
  timeoutMs = 5000
): Promise<ExecuteResponse> {
  if (!env.EXECUTION_SERVICE_URL) {
    throw new Error('EXECUTION_SERVICE_URL is not configured');
  }

  const res = await fetch(`${env.EXECUTION_SERVICE_URL}/internal/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language, code, testCases, timeoutMs }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Execution sandbox returned ${res.status}: ${body}`);
  }

  return (await res.json()) as ExecuteResponse;
}
