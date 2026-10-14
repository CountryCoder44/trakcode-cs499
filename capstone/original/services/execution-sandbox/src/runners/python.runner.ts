import path from 'path';
import { promises as fs } from 'fs';
import { withTempDir } from '../utils/tempDir';
import { runProcess } from '../utils/runProcess';
import { resolvePythonCommand } from '../utils/interpreters';
import { RunOptions, RunnerResult, TestResult } from './types';

export async function runPython({ code, testCases, timeoutMs }: RunOptions): Promise<RunnerResult> {
  return withTempDir('py', async (dir) => {
    const pythonCmd = resolvePythonCommand();
    if (!pythonCmd) {
      return { results: [], allPassed: false, stderr: '', compileError: 'No Python interpreter found on this host (tried python, python3)' };
    }

    const file = path.join(dir, 'solution.py');
    await fs.writeFile(file, code, 'utf8');

    const results: TestResult[] = [];
    let stderrCombined = '';

    for (const tc of testCases) {
      const { stdout, stderr, timedOut, timeMs } = await runProcess(pythonCmd, [file], tc.input, timeoutMs, dir);
      const actualOutput = timedOut ? '[timed out]' : stdout.trim();
      const passed = !timedOut && actualOutput === tc.expectedOutput.trim();
      if (stderr) stderrCombined += `${stderr}\n`;
      results.push({ passed, actualOutput, expectedOutput: tc.expectedOutput, timeMs });
    }

    return {
      results,
      allPassed: results.length > 0 && results.every((r) => r.passed),
      stderr: stderrCombined.trim(),
      compileError: null,
    };
  });
}
