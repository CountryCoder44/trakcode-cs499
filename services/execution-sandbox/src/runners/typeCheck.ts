import path from 'path';
import { promises as fs } from 'fs';
import ts from 'typescript';

// Strict `tsc` gate for the Sequential Curriculum's TypeScript course.
//
// The normal TypeScript runner path uses esbuild, which STRIPS types without
// checking them — correct for a behaviour-grading code judge. But the
// TypeScript course is "strict from the beginning": a practical only counts as
// passed when the learner's code both type-checks under `--strict` AND produces
// the right output. This module is that first gate. It is opt-in per request
// (`strictTypeCheck` on /internal/execute); the main API turns it on for every
// `typescript`-course code item (see server `seqGrader.ts`).
//
// On a diagnostic, the runner returns the formatted text through the existing
// `compileError` channel — same shape the C++ compile-error path already uses,
// so the learner-facing UI needs no change.

// `ts.createProgram` resolves `node_modules/@types` by walking up from the
// source file. The sandbox writes that file into an OS temp dir OUTSIDE the
// repo, so the walk never reaches the repo's `@types/node`. Resolve it
// explicitly and pin it as a typeRoot instead.
function resolveNodeTypeRoot(): string | null {
  try {
    // .../node_modules/@types/node/package.json  ->  .../node_modules/@types
    return path.dirname(path.dirname(require.resolve('@types/node/package.json')));
  } catch {
    return null;
  }
}

const NODE_TYPE_ROOT = resolveNodeTypeRoot();

const BASE_OPTIONS: ts.CompilerOptions = {
  strict: true,
  noEmit: true,
  // Match the runtime: the sandbox executes on Node 20, which supports ES2022
  // (String.prototype.replaceAll, Array.prototype.at, Object.hasOwn, top-level
  // error causes, …). Keep the type-check lib in step so modern-but-standard
  // methods aren't rejected as "change your target library".
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.CommonJS,
  moduleResolution: ts.ModuleResolutionKind.Node10,
  esModuleInterop: true,
  forceConsistentCasingInFileNames: true,
  skipLibCheck: true,
  ...(NODE_TYPE_ROOT
    ? { lib: ['lib.es2022.d.ts'], types: ['node'], typeRoots: [NODE_TYPE_ROOT] }
    : // No @types/node available — still let `console` resolve via the DOM lib's
      // ambient declaration so a plain `console.log` program type-checks.
      { lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'], types: [] }),
};

export interface TypeCheckResult {
  ok: boolean;
  diagnostics: string; // formatted `solution.ts(L,C): error TSxxxx: ...`; '' when ok
}

export async function typeCheckTypeScript(code: string, dir: string): Promise<TypeCheckResult> {
  const fileName = path.join(dir, 'solution.ts');
  await fs.writeFile(fileName, code, 'utf8');

  const program = ts.createProgram([fileName], BASE_OPTIONS);
  const diagnostics = ts.getPreEmitDiagnostics(program);

  if (diagnostics.length === 0) return { ok: true, diagnostics: '' };

  const formatHost: ts.FormatDiagnosticsHost = {
    getCanonicalFileName: (f) => f,
    getCurrentDirectory: () => dir,
    getNewLine: () => '\n',
  };
  const text = ts
    .formatDiagnostics(diagnostics, formatHost)
    .split(dir + path.sep)
    .join('')
    .split(dir + '/')
    .join('')
    .trim();

  return { ok: false, diagnostics: text };
}
