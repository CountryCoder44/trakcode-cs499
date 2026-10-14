import path from 'path';
import { promises as fs } from 'fs';
import { withTempDir } from '../utils/tempDir';
import { runProcess } from '../utils/runProcess';
import { outputsMatch } from '../utils/compareOutput';
import { resolveJava } from '../utils/interpreters';
import { checkExpectedFiles, prepareCaseDir, usesCaseDirs, writeFiles } from '../utils/fixtures';
import { RunOptions, RunnerResult, TestResult } from './types';

const COMPILE_TIMEOUT_MS = 20_000;
// The JVM itself takes a moment to start, so each test case gets this much
// on top of the requested time limit.
const JVM_STARTUP_ALLOWANCE_MS = 1_500;

// Options for a small, quick-starting JVM inside the sandbox (512 MB, 128
// processes for the whole container): one GC thread, one CPU's worth of threads,
// the fast-start JIT tier only, a modest heap, and no perf-data file (the
// sandbox's filesystem is read-only apart from the run's temp dir).
const JVM_FLAGS = [
  '-XX:+UseSerialGC',
  '-XX:TieredStopAtLevel=1',
  '-XX:ActiveProcessorCount=1',
  '-Xss8m',
  '-Xmx128m',
  '-XX:-UsePerfData',
  '-Xshare:auto',
];

/**
 * The class to run. Java requires a public class to live in a file of the same
 * name, so this is the first top-level `public class`; failing that, the class
 * that declares `main`; failing that, `Main` (the usual beginner convention).
 */
export function mainClassName(code: string): string {
  const stripped = code
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/.*$/gm, ' ')
    .replace(/"(?:\\.|[^"\\])*"/g, '""');
  const publicClass = stripped.match(
    /\bpublic\s+(?:(?:final|abstract|static)\s+)*(?:class|record|enum|interface)\s+([A-Za-z_$][\w$]*)/,
  );
  if (publicClass) return publicClass[1];
  // The nearest class declared before `static void main(`.
  const mainAt = stripped.search(/\bstatic\s+void\s+main\s*\(/);
  if (mainAt >= 0) {
    const before = [...stripped.slice(0, mainAt).matchAll(/\b(?:class|record|enum)\s+([A-Za-z_$][\w$]*)/g)];
    if (before.length) return before[before.length - 1][1];
  }
  return 'Main';
}

// Compile once with javac, then run the class once per test case. Fixture
// files (data, or a provided helper class such as a mock API) sit next to the
// source; provided .java files are compiled with it.
export async function runJava(opts: RunOptions): Promise<RunnerResult> {
  const { code, testCases, timeoutMs } = opts;
  return withTempDir('java', async (dir) => {
    const jdk = resolveJava();
    if (!jdk) {
      return {
        results: [],
        allPassed: false,
        stderr: '',
        compileError: 'No Java compiler found on this host (javac)',
      };
    }

    const className = mainClassName(code);
    const sourceFile = path.join(dir, `${className}.java`);
    await fs.writeFile(sourceFile, code, 'utf8');
    await writeFiles(dir, opts.files ?? []);
    const providedSources = (opts.files ?? [])
      .filter((f) => f.path.endsWith('.java'))
      .map((f) => path.join(dir, ...f.path.split('/')));
    const perCase = usesCaseDirs(opts);

    const compileResult = await runProcess(
      jdk.javac,
      [
        '-J-XX:+UseSerialGC',
        '-J-XX:TieredStopAtLevel=1',
        '-J-XX:-UsePerfData',
        '-J-XX:ActiveProcessorCount=1',
        '-J-Xmx160m',
        '-encoding',
        'UTF-8',
        '-Xlint:none',
        '-d',
        dir,
        sourceFile,
        ...providedSources,
      ],
      '',
      COMPILE_TIMEOUT_MS,
      dir,
    );
    if (compileResult.exitCode !== 0) {
      return {
        results: [],
        allPassed: false,
        stderr: '',
        compileError: compileResult.timedOut
          ? 'Compilation timed out'
          : // Show the file by name, not the run's temp path.
            (compileResult.stderr || compileResult.stdout).split(sourceFile).join(`${className}.java`).trim() ||
            'Compilation failed',
      };
    }

    const results: TestResult[] = [];
    let stderrCombined = '';

    for (const [i, tc] of testCases.entries()) {
      const cwd = perCase ? await prepareCaseDir(dir, i, opts, tc) : dir;
      const { stdout, stderr, timedOut, timeMs } = await runProcess(
        jdk.java,
        [...JVM_FLAGS, '-Dfile.encoding=UTF-8', '-Dstdout.encoding=UTF-8', '-cp', dir, className],
        tc.input,
        timeoutMs + JVM_STARTUP_ALLOWANCE_MS,
        cwd,
      );
      const actualOutput = timedOut ? '[timed out]' : stdout.trim();
      const fileChecks = timedOut ? undefined : await checkExpectedFiles(cwd, tc.expectedFiles);
      const passed = !timedOut && outputsMatch(stdout, tc.expectedOutput) && (fileChecks ?? []).every((c) => c.passed);
      if (stderr) stderrCombined += `${stderr}\n`;
      results.push({
        passed,
        actualOutput,
        expectedOutput: tc.expectedOutput,
        timeMs,
        ...(fileChecks ? { fileChecks } : {}),
      });
    }

    return {
      results,
      allPassed: results.length > 0 && results.every((r) => r.passed),
      stderr: stderrCombined.trim(),
      compileError: null,
    };
  });
}
