import path from 'path';
import { promises as fs } from 'fs';
import { withTempDir } from '../utils/tempDir';
import { runProcess } from '../utils/runProcess';
import { outputsMatch } from '../utils/compareOutput';
import { resolvePythonCommand } from '../utils/interpreters';
import { checkExpectedFiles, prepareCaseDir, usesCaseDirs } from '../utils/fixtures';
import { RunOptions, RunnerResult, TestResult } from './types';

export async function runPython(opts: RunOptions): Promise<RunnerResult> {
  const { code, testCases, timeoutMs } = opts;
  return withTempDir('py', async (dir) => {
    const pythonCmd = resolvePythonCommand();
    if (!pythonCmd) {
      return { results: [], allPassed: false, stderr: '', compileError: 'No Python interpreter found on this host (tried python, python3)' };
    }

    const perCase = usesCaseDirs(opts);
    const sharedFile = path.join(dir, 'solution.py');
    if (!perCase) await fs.writeFile(sharedFile, code, 'utf8');

    const results: TestResult[] = [];
    let stderrCombined = '';

    for (const [i, tc] of testCases.entries()) {
      // With fixtures, each case gets its own directory holding the solution
      // and the fixtures, so `open("data.csv")` and `import helper` both work
      // and nothing one case writes is visible to the next.
      const cwd = perCase ? await prepareCaseDir(dir, i, opts, tc) : dir;
      const file = perCase ? path.join(cwd, 'solution.py') : sharedFile;
      if (perCase) await fs.writeFile(file, code, 'utf8');

      const { stdout, stderr, timedOut, timeMs } = await runProcess(pythonCmd, [file], tc.input, timeoutMs, cwd);
      const actualOutput = timedOut ? '[timed out]' : stdout.trim();
      const fileChecks = timedOut ? undefined : await checkExpectedFiles(cwd, tc.expectedFiles);
      const passed = !timedOut && outputsMatch(stdout, tc.expectedOutput) && (fileChecks ?? []).every((c) => c.passed);
      if (stderr) stderrCombined += `${stderr}\n`;
      results.push({ passed, actualOutput, expectedOutput: tc.expectedOutput, timeMs, ...(fileChecks ? { fileChecks } : {}) });
    }

    return {
      results,
      allPassed: results.length > 0 && results.every((r) => r.passed),
      stderr: stderrCombined.trim(),
      compileError: null,
    };
  });
}
