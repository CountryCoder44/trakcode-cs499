import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';
import { runProcess } from '../runProcess';

function pidIsAlive(pid: number): boolean {
  try {
    // Signal 0 sends nothing — it just probes whether the pid exists and is
    // signalable. Node shims this on Windows too.
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function waitUntil(predicate: () => boolean, timeoutMs: number, intervalMs = 100): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return true;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return predicate();
}

describe('runProcess', () => {
  it('resolves normally for a quick, well-behaved process', async () => {
    const result = await runProcess(process.execPath, ['-e', 'console.log("hi")'], '', 5000, os.tmpdir());
    expect(result.timedOut).toBe(false);
    expect(result.stdout.trim()).toBe('hi');
  });

  // The real bug this exists to prevent: a submission that spawns its own
  // subprocess and then hangs used to leave that subprocess running forever
  // after the timeout "killed" it — `child.kill('SIGKILL')` only ever
  // touched the one process we spawned directly, never anything it spawned
  // itself. Simulates exactly that shape (a direct child that spawns a
  // grandchild, records its pid, then hangs) and asserts the grandchild is
  // actually gone after the timeout fires — not just the direct child.
  //
  // Doesn't discriminate old vs. new code on THIS Windows dev machine
  // specifically — verified by hand that even a bare, untargeted
  // `taskkill /pid <parent> /f` (no /T) already cascades to a plain
  // `stdio:'ignore'` child here, some ambient Windows session/job behavior
  // unrelated to this fix. It's still a real regression guard: CI runs this
  // same test on ubuntu-latest, where a plain child has no such ambient
  // net — it gets reparented to init and keeps running unless something
  // explicitly signals its process group, exactly what killTree's POSIX
  // branch does. That's also the actual production target per this repo's
  // own notes (Fargate/Linux, not Windows).
  it(
    'kills the whole process tree on timeout, not just the direct child',
    async () => {
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'runprocess-tree-test-'));
      const pidFile = path.join(tmpDir, 'grandchild.pid');

      // Left undetached on purpose — the realistic shape of a subprocess.Popen
      // / child_process.spawn call from inside submitted code, not a
      // deliberately session-detached evasion.
      const grandchildScript = 'setInterval(() => {}, 1000);';
      const parentScript = `
        const { spawn } = require('child_process');
        const fs = require('fs');
        const gc = spawn(process.execPath, ['-e', ${JSON.stringify(grandchildScript)}], { stdio: 'ignore' });
        gc.unref();
        fs.writeFileSync(${JSON.stringify(pidFile)}, String(gc.pid));
        setInterval(() => {}, 1000);
      `;

      try {
        const result = await runProcess(process.execPath, ['-e', parentScript], '', 500, tmpDir);
        expect(result.timedOut).toBe(true);

        const grandchildPid = Number(await fs.readFile(pidFile, 'utf8'));
        expect(Number.isInteger(grandchildPid)).toBe(true);

        // Tree-kill is itself async (a spawned `taskkill` on Windows, a
        // signal on POSIX) — give it a real grace window rather than
        // asserting the instant runProcess resolves.
        const died = await waitUntil(() => !pidIsAlive(grandchildPid), 5000);
        expect(died).toBe(true);
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      }
    },
    15000
  );
});
