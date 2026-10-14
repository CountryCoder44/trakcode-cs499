import path from 'path';
import { promises as fs } from 'fs';
import { withTempDir } from '../utils/tempDir';
import { runProcess } from '../utils/runProcess';
import { resolveCppCompiler } from '../utils/interpreters';
import { RunOptions, RunnerResult, TestResult } from './types';

const COMPILE_TIMEOUT_MS = 15_000;

// Real two-step compile-then-run per spec §4.
export async function runCpp({ code, testCases, timeoutMs }: RunOptions): Promise<RunnerResult> {
  return withTempDir('cpp', async (dir) => {
    const compiler = resolveCppCompiler();
    if (!compiler) {
      return { results: [], allPassed: false, stderr: '', compileError: 'No C++ compiler found on this host (tried g++, clang++)' };
    }

    const sourceFile = path.join(dir, 'solution.cpp');
    const binaryFile = path.join(dir, process.platform === 'win32' ? 'solution.exe' : 'solution');
    await fs.writeFile(sourceFile, code, 'utf8');

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

    for (const tc of testCases) {
      const { stdout, stderr, timedOut, timeMs } = await runProcess(binaryFile, [], tc.input, timeoutMs, dir);
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
