import path from 'path';
import { spawnSync } from 'child_process';

// Cache the resolved command for the lifetime of the process — avoids re-probing
// PATH on every single execution request.
let cachedPython: string | null | undefined;
let cachedCpp: string | null | undefined;
let cachedJava: { javac: string; java: string } | null | undefined;

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

// A JDK: `javac` to compile and `java` to run. Checks JAVA_HOME first, then
// PATH. Both must come from a JDK (a JRE alone has no javac).
export function resolveJava(): { javac: string; java: string } | null {
  if (cachedJava !== undefined) return cachedJava;
  const candidates: { javac: string; java: string }[] = [];
  const home = process.env.JAVA_HOME;
  if (home) {
    const bin = path.join(home, 'bin');
    candidates.push({ javac: path.join(bin, 'javac'), java: path.join(bin, 'java') });
  }
  candidates.push({ javac: 'javac', java: 'java' });
  const versionWorks = (cmd: string) => {
    try {
      return spawnSync(cmd, ['-version'], { windowsHide: true }).status === 0;
    } catch {
      return false;
    }
  };
  cachedJava = candidates.find((c) => versionWorks(c.javac) && versionWorks(c.java)) ?? null;
  return cachedJava;
}
