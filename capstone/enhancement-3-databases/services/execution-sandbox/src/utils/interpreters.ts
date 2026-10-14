import { spawnSync } from 'child_process';

// Cache the resolved command for the lifetime of the process — avoids re-probing
// PATH on every single execution request.
let cachedPython: string | null | undefined;
let cachedCpp: string | null | undefined;

function commandWorks(cmd: string): boolean {
  try {
    const res = spawnSync(cmd, ['--version'], { windowsHide: true });
    return res.status === 0;
  } catch {
    return false;
  }
}

export function resolvePythonCommand(): string | null {
  if (cachedPython !== undefined) return cachedPython;
  cachedPython = ['python', 'python3'].find(commandWorks) ?? null;
  return cachedPython;
}

export function resolveCppCompiler(): string | null {
  if (cachedCpp !== undefined) return cachedCpp;
  cachedCpp = ['g++', 'clang++'].find(commandWorks) ?? null;
  return cachedCpp;
}
