// Shared domain enums reused across multiple models (problems, submissions,
// …) — defined once so they can't drift out of sync with each other.
export type Stack = 'python' | 'typescript' | 'cpp' | 'java';

// The three runtimes the execution sandbox (§4) actually supports — used by
// both submissions.language and the sandbox client's request shape. TypeScript
// is transpiled to JS (esbuild, types stripped) and run on Node — see
// services/execution-sandbox/src/runners/typescript.runner.ts.
export type ExecutionLanguage = 'python' | 'typescript' | 'cpp' | 'java';
