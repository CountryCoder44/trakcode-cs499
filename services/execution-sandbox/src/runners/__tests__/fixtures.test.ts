import { runPython } from '../python.runner';
import { runTypeScript } from '../typescript.runner';
import { isSafeRelativePath, validateFixtures } from '../../utils/fixtures';
import { resolvePythonCommand } from '../../utils/interpreters';

// Real interpreter runs. Python may be missing on a CI box; skip those then.
const pyIt = resolvePythonCommand() ? it : it.skip;

describe('fixture paths', () => {
  it('accepts plain relative paths and rejects anything that could escape', () => {
    expect(isSafeRelativePath('data/orders.csv')).toBe(true);
    for (const bad of ['../x', '/etc/passwd', 'C:/x', 'a/../../b', 'a\\b', '', './a']) {
      expect(isSafeRelativePath(bad)).toBe(false);
    }
    expect(validateFixtures({ files: [{ path: '../oops', content: '' }], testCases: [] })).toMatch(/Unsafe/);
  });
});

describe('python runner with fixtures', () => {
  pyIt('reads a shared fixture, a per-case fixture, imports a helper, and checks written files', async () => {
    const code = [
      'import helper',
      'rows = open("data/in.txt").read().split()',
      'extra = open("extra.txt").read().strip()',
      'open("out.txt", "w").write(helper.shout(extra) + "\\n")',
      'print(len(rows))',
    ].join('\n');
    const result = await runPython({
      code,
      timeoutMs: 10_000,
      files: [
        { path: 'data/in.txt', content: 'a b c' },
        { path: 'helper.py', content: 'def shout(s):\n    return s.upper()\n' },
      ],
      testCases: [
        { input: '', expectedOutput: '3', files: [{ path: 'extra.txt', content: 'one' }], expectedFiles: [{ path: 'out.txt', content: 'ONE' }] },
        { input: '', expectedOutput: '3', files: [{ path: 'extra.txt', content: 'two' }], expectedFiles: [{ path: 'out.txt', content: 'WRONG' }] },
      ],
    });
    expect(result.compileError).toBeNull();
    expect(result.results[0].passed).toBe(true);
    // Output matched but the written file did not, so the case fails.
    expect(result.results[1].passed).toBe(false);
    expect(result.results[1].fileChecks?.[0]).toMatchObject({ path: 'out.txt', passed: false, actualContent: 'TWO\n' });
  });

  pyIt("doesn't let one case see files another case wrote", async () => {
    const code = 'import os\nprint(os.path.exists("left.txt"))\nopen("left.txt", "w").write("x")';
    const result = await runPython({
      code,
      timeoutMs: 10_000,
      files: [{ path: 'seed.txt', content: '' }],
      testCases: [
        { input: '', expectedOutput: 'False' },
        { input: '', expectedOutput: 'False' },
      ],
    });
    expect(result.allPassed).toBe(true);
  });
});

describe('typescript runner with fixtures', () => {
  it('compiles a provided .ts helper module and reads a data file', async () => {
    const code = [
      "import { readFileSync } from 'fs';",
      "import { get } from './mock_api';",
      "const body = JSON.parse(get('/users'));",
      "const n: number = readFileSync('data.txt', 'utf8').trim().split(',').length;",
      'console.log(body.users.length + n);',
    ].join('\n');
    const result = await runTypeScript({
      code,
      timeoutMs: 10_000,
      files: [
        { path: 'mock_api.ts', content: "export function get(path: string): string { return JSON.stringify({ users: [1, 2] }); }" },
        { path: 'data.txt', content: 'a,b,c' },
      ],
      testCases: [{ input: '', expectedOutput: '5' }],
    });
    expect(result.compileError).toBeNull();
    expect(result.allPassed).toBe(true);
  });
});
