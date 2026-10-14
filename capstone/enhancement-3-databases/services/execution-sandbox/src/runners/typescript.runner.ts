import path from 'path';
import { promises as fs } from 'fs';
import * as esbuild from 'esbuild';
import { withTempDir } from '../utils/tempDir';
import { runProcess } from '../utils/runProcess';
import { outputsMatch } from '../utils/compareOutput';
import { RunOptions, RunnerResult, TestResult } from './types';
import { typeCheckTypeScript } from './typeCheck';

export async function runTypeScript({ code, testCases, timeoutMs, strictTypeCheck }: RunOptions): Promise<RunnerResult> {
  return withTempDir('ts', async (dir) => {
    // Sequential Curriculum's TypeScript course grades "strict from the
    // beginning": type-check under `--strict` first, and if it fails, stop
    // here — the learner sees the diagnostics, not a run result. Plain
    // Practice Mode / one-off runs leave this off and get the old esbuild-only
    // (runtime-behaviour) path.
    if (strictTypeCheck) {
      const tc = await typeCheckTypeScript(code, dir);
      if (!tc.ok) {
        return { results: [], allPassed: false, stderr: '', compileError: tc.diagnostics };
      }
    }

    // esbuild strips the types (and lowers TS-only syntax like enums) to plain
    // CommonJS the host Node can run directly — after this it's the exact same
    // "write a file, run it under process.execPath" path the old JS runner
    // used. No type-checking on purpose: a code judge grades runtime
    // behaviour, and tsc-style type errors would just get in a learner's way.
    let js: string;
    try {
      const out = await esbuild.transform(code, {
        loader: 'ts',
        format: 'cjs',
        platform: 'node',
        target: 'node20',
        sourcefile: 'solution.ts',
      });
      js = out.code;
    } catch (err) {
      // A transform failure is a real syntax error in the submitted code —
      // surface it the way the C++ runner surfaces a compile error rather
      // than as an opaque 500.
      const message =
        err && typeof err === 'object' && 'errors' in err
          ? (err as esbuild.TransformFailure).errors.map((e) => e.text).join('\n') || String(err)
          : err instanceof Error
            ? err.message
            : String(err);
      return { results: [], allPassed: false, stderr: '', compileError: message };
    }

    const file = path.join(dir, 'solution.js');
    await fs.writeFile(file, js, 'utf8');

    const results: TestResult[] = [];
    let stderrCombined = '';

    for (const tc of testCases) {
      // Run under the same Node binary hosting this service — no network/eval
      // sandboxing beyond what runProcess already provides (see runner README).
      const { stdout, stderr, timedOut, timeMs } = await runProcess(process.execPath, [file], tc.input, timeoutMs, dir);
      const actualOutput = timedOut ? '[timed out]' : stdout.trim();
      const passed = !timedOut && outputsMatch(stdout, tc.expectedOutput);
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
