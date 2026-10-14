import path from 'path';
import { promises as fs } from 'fs';
import { withTempDir } from '../utils/tempDir';
import { runProcess } from '../utils/runProcess';
import { outputsMatch } from '../utils/compareOutput';
import { resolveCppCompiler } from '../utils/interpreters';
import { checkExpectedFiles, prepareCaseDir, usesCaseDirs, writeFiles } from '../utils/fixtures';
import { RunOptions, RunnerResult, TestResult } from './types';

const COMPILE_TIMEOUT_MS = 15_000;

// Real two-step compile-then-run per spec §4.
export async function runCpp(opts: RunOptions): Promise<RunnerResult> {
  const { code, testCases, timeoutMs } = opts;
  return withTempDir('cpp', async (dir) => {
    const compiler = resolveCppCompiler();
    if (!compiler) {
      return { results: [], allPassed: false, stderr: '', compileError: 'No C++ compiler found on this host (tried g++, clang++)' };
    }

    const sourceFile = path.join(dir, 'solution.cpp');
    const binaryFile = path.join(dir, process.platform === 'win32' ? 'solution.exe' : 'solution');
    await fs.writeFile(sourceFile, code, 'utf8');
    // Provided headers (e.g. a mock API) have to sit next to the source to compile.
    await writeFiles(dir, opts.files ?? []);
    const perCase = usesCaseDirs(opts);

    const compileResult = await runProcess(
      compiler,
      [sourceFile, '-O2', '-std=c++17', '-o', binaryFile],
      '',
      COMPILE_TIMEOUT_MS,
      dir
    );
    if (compileResult.exitCode !== 0) {
      return {
        results: [],
        allPassed: false,
        stderr: '',
        compileError: compileResult.timedOut
          ? 'Compilation timed out'
          : compileResult.stderr.trim() || 'Compilation failed',
      };
    }

    const results: TestResult[] = [];
    let stderrCombined = '';

    for (const [i, tc] of testCases.entries()) {
      const cwd = perCase ? await prepareCaseDir(dir, i, opts, tc) : dir;
      const { stdout, stderr, timedOut, timeMs } = await runProcess(binaryFile, [], tc.input, timeoutMs, cwd);
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
