import path from 'path';
import { promises as fs } from 'fs';
import { withTempDir } from '../utils/tempDir';
import { runProcess } from '../utils/runProcess';
import { RunOptions, RunnerResult, TestResult } from './types';

export async function runJavaScript({ code, testCases, timeoutMs }: RunOptions): Promise<RunnerResult> {
  return withTempDir('js', async (dir) => {
    const file = path.join(dir, 'solution.js');
    await fs.writeFile(file, code, 'utf8');

    const results: TestResult[] = [];
    let stderrCombined = '';

    for (const tc of testCases) {
      // Run under the same Node binary hosting this service — no network/eval
      // sandboxing beyond what runProcess already provides (see runner README).
      const { stdout, stderr, timedOut, timeMs } = await runProcess(process.execPath, [file], tc.input, timeoutMs, dir);
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
