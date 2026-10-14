// Shared domain enums reused across multiple models (curriculumItems, problems,
// submissions, …) — defined once so they can't drift out of sync with each other.
export type Stack = 'python' | 'mern' | 'cpp';

// The three runtimes the execution sandbox (§4) actually supports — used by
// both submissions.language and the sandbox client's request shape.
export type ExecutionLanguage = 'python' | 'javascript' | 'cpp';
