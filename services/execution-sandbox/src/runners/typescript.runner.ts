import path from 'path';
import { promises as fs } from 'fs';
import * as esbuild from 'esbuild';
import { withTempDir } from '../utils/tempDir';
import { runProcess } from '../utils/runProcess';
import { outputsMatch } from '../utils/compareOutput';
import { checkExpectedFiles, prepareCaseDir, usesCaseDirs } from '../utils/fixtures';
import { FixtureFile, RunOptions, RunnerResult, TestResult } from './types';
import { typeCheckTypeScript } from './typeCheck';

// A provided helper module written in TypeScript (e.g. a mock API) has to be
// compiled like the solution, or `require('./mock_api')` finds nothing to load.
async function compileTsFixtures(files: FixtureFile[] | undefined): Promise<FixtureFile[]> {
  const out: FixtureFile[] = [];
  for (const f of files ?? []) {
    if (!f.path.endsWith('.ts')) continue;
    const js = await esbuild.transform(f.content, { loader: 'ts', format: 'cjs', platform: 'node', target: 'node20', sourcefile: f.path });
    out.push({ path: f.path.replace(/\.ts$/, '.js'), content: js.code });
  }
  return out;
}

export async function runTypeScript(opts: RunOptions): Promise<RunnerResult> {
  const { code, testCases, timeoutMs, strictTypeCheck } = opts;
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

    const perCase = usesCaseDirs(opts);
    const sharedFile = path.join(dir, 'solution.js');
    if (!perCase) await fs.writeFile(sharedFile, js, 'utf8');
    let compiledFixtures: FixtureFile[] = [];
    try {
      compiledFixtures = await compileTsFixtures(opts.files);
    } catch (err) {
      return { results: [], allPassed: false, stderr: '', compileError: `A provided helper file failed to compile: ${err instanceof Error ? err.message : String(err)}` };
    }

    const results: TestResult[] = [];
    let stderrCombined = '';

    for (const [i, tc] of testCases.entries()) {
      const cwd = perCase ? await prepareCaseDir(dir, i, opts, tc) : dir;
      const file = perCase ? path.join(cwd, 'solution.js') : sharedFile;
      if (perCase) {
        await fs.writeFile(file, js, 'utf8');
        for (const f of compiledFixtures) await fs.writeFile(path.join(cwd, ...f.path.split('/')), f.content, 'utf8');
      }
      // Run under the same Node binary hosting this service — no network/eval
      // sandboxing beyond what runProcess already provides (see runner README).
      const { stdout, stderr, timedOut, timeMs } = await runProcess(process.execPath, [file], tc.input, timeoutMs, cwd);
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
