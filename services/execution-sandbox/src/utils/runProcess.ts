import { spawn } from 'child_process';

export interface ProcessRunResult {
  stdout: string;
  stderr: string;
  timedOut: boolean;
  timeMs: number;
  exitCode: number | null;
}

const MAX_OUTPUT_BYTES = 1_000_000; // 1MB cap per stream — guards against runaway output

// Found live: on Windows, a Python process's stdout is opened in text mode
// with the platform's default newline translation, so print() actually
// writes real \r\n bytes for every line — not just at the very end. Every
// runner's own `.trim()` before comparing to expectedOutput only strips the
// string's outer edges, so it catches a single trailing \r\n but does
// nothing for \r\n between internal lines. The result: any multi-line
// program's output looks byte-identical to the expected value when printed
// for debugging, yet fails a strict `===` comparison — this silently broke
// both AI problem-generation validation (repeatedly exhausting all 3
// retries on multi-line problems) and would have broken real learner
// submissions with multi-line output the exact same way. Normalizing once
// here, for every runner/language uniformly, is the standard fix any code
// judge needs regardless of host OS — matches how Codeforces/LeetCode-style
// judges always normalize line endings before comparison.
function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, '\n');
}

// Found via a live audit, not a reported bug: `child.kill('SIGKILL')` only
// kills the ONE process we spawned directly (python/node/solution.exe) — not
// any subprocess it spawns of its own (subprocess.Popen, child_process.spawn,
// os.system, a compiled binary calling system(), ...). Since this service's
// whole job is running untrusted/AI-generated code with a wall-clock timeout
// instead of real container isolation (see services/execution-sandbox/README.md),
// a submission that spawns its own child and then hangs would leave that
// child running forever after we "kill" it — a genuinely orphaned process,
// invisible to us and never cleaned up. Fixed by killing the whole tree:
//   - POSIX: `detached: true` at spawn time makes the child the leader of its
//     own process group (pgid === pid); signaling the negative pid delivers
//     the signal to every process in that group at once.
//   - Windows has no process-group equivalent for this — `taskkill /T` walks
//     the OS's own parent-child process records and kills the whole
//     descendant tree by PID instead. No `detached` needed there.
function killTree(child: ReturnType<typeof spawn>): void {
  if (!child.pid) return;
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true }).on('error', () => {});
  } else {
    try {
      process.kill(-child.pid, 'SIGKILL');
    } catch {
      // Process group already gone, or this process was never its own group
      // leader for some reason — fall back to killing just the one pid.
      child.kill('SIGKILL');
    }
  }
}

// Runs a single process to completion (or until timeoutMs, then SIGKILLs its
// whole process tree — see killTree above). Uses spawn with an argv array
// (never a shell string), so nothing in `code` or `input` can be interpreted
// as shell syntax.
export function runProcess(
  command: string,
  args: string[],
  input: string,
  timeoutMs: number,
  cwd: string
): Promise<ProcessRunResult> {
  return new Promise((resolve) => {
    const start = Date.now();
    let child: ReturnType<typeof spawn>;

    try {
      // detached (POSIX only, see killTree) must be set at spawn time — it
      // can't be applied retroactively once the process already exists.
      child = spawn(command, args, { cwd, windowsHide: true, detached: process.platform !== 'win32' });
    } catch (err) {
      resolve({
        stdout: '',
        stderr: err instanceof Error ? err.message : String(err),
        timedOut: false,
        timeMs: Date.now() - start,
        exitCode: null,
      });
      return;
    }

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let settled = false;

    const timer = setTimeout(() => {
      timedOut = true;
      killTree(child);
    }, timeoutMs);

    // Checking length before appending (rather than after, or capping the
    // slice) lets a single large chunk blow well past MAX_OUTPUT_BYTES for
    // that call — a runaway program that dumps tens of MB in one write isn't
    // actually capped. Slicing the chunk itself keeps every call's memory use
    // bounded regardless of how the output arrives.
    child.stdout?.on('data', (chunk: Buffer) => {
      if (stdout.length >= MAX_OUTPUT_BYTES) return;
      stdout += chunk.toString('utf8', 0, MAX_OUTPUT_BYTES - stdout.length);
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      if (stderr.length >= MAX_OUTPUT_BYTES) return;
      stderr += chunk.toString('utf8', 0, MAX_OUTPUT_BYTES - stderr.length);
    });

    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        stdout: normalizeLineEndings(stdout),
        stderr: normalizeLineEndings(stderr ? `${stderr}\n${err.message}` : err.message),
        timedOut,
        timeMs: Date.now() - start,
        exitCode: null,
      });
    });

    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        stdout: normalizeLineEndings(stdout),
        stderr: normalizeLineEndings(stderr),
        timedOut,
        timeMs: Date.now() - start,
        exitCode: code,
      });
    });

    child.stdin?.on('error', () => {
      // Swallow EPIPE-style errors from writing to a process that already exited —
      // the 'close'/'error' handlers above still resolve the promise.
    });
    child.stdin?.write(input ?? '');
    child.stdin?.end();
  });
}
