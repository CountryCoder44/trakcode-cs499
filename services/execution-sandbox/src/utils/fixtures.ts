import path from 'path';
import { promises as fs } from 'fs';
import { outputsMatch } from './compareOutput';
import { FileCheck, FixtureFile, RunOptions, TestCase } from '../runners/types';

export const MAX_FIXTURE_FILES = 30;
export const MAX_FIXTURE_BYTES = 512 * 1024;

// Fixture paths come from generated content, so they are treated as untrusted:
// relative, no "..", no drive letters, nothing that could escape the run dir.
export function isSafeRelativePath(p: string): boolean {
  if (!p || p.length > 200) return false;
  if (path.isAbsolute(p) || /^[a-zA-Z]:/.test(p) || p.includes('\\')) return false;
  return p.split('/').every((part) => part !== '' && part !== '.' && part !== '..');
}

export function validateFixtures(opts: Pick<RunOptions, 'files' | 'testCases'>): string | null {
  const all: FixtureFile[] = [
    ...(opts.files ?? []),
    ...opts.testCases.flatMap((t) => [...(t.files ?? []), ...(t.expectedFiles ?? [])]),
  ];
  if ((opts.files?.length ?? 0) > MAX_FIXTURE_FILES) return `Too many fixture files (max ${MAX_FIXTURE_FILES})`;
  const bytes = all.reduce((n, f) => n + Buffer.byteLength(f.content, 'utf8'), 0);
  if (bytes > MAX_FIXTURE_BYTES) return 'Fixture files are too large';
  const bad = all.find((f) => !isSafeRelativePath(f.path));
  return bad ? `Unsafe fixture path: ${bad.path}` : null;
}

/** True when this run needs a separate working directory per test case. */
export function usesCaseDirs(opts: Pick<RunOptions, 'files' | 'testCases'>): boolean {
  return Boolean(opts.files?.length) || opts.testCases.some((t) => t.files?.length || t.expectedFiles?.length);
}

export async function writeFiles(dir: string, files: FixtureFile[]): Promise<void> {
  for (const f of files) {
    const target = path.join(dir, ...f.path.split('/'));
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, f.content, 'utf8');
  }
}

/** A fresh directory for one test case, holding the shared and per-case fixtures. */
export async function prepareCaseDir(root: string, index: number, opts: Pick<RunOptions, 'files'>, tc: TestCase): Promise<string> {
  const dir = path.join(root, `case-${index}`);
  await fs.mkdir(dir, { recursive: true });
  await writeFiles(dir, [...(opts.files ?? []), ...(tc.files ?? [])]);
  return dir;
}

export async function checkExpectedFiles(dir: string, expected: FixtureFile[] | undefined): Promise<FileCheck[] | undefined> {
  if (!expected?.length) return undefined;
  const checks: FileCheck[] = [];
  for (const f of expected) {
    let actual: string | null = null;
    try {
      actual = (await fs.readFile(path.join(dir, ...f.path.split('/')), 'utf8')).replace(/\r\n/g, '\n');
    } catch {
      actual = null;
    }
    checks.push({ path: f.path, passed: actual !== null && outputsMatch(actual, f.content), actualContent: actual });
  }
  return checks;
}
