// Practice Mode concept catalog.
//
// Every concept Practice Mode reasons about has a stable id here, scoped to one
// language. Two kinds:
//   - foundation: the language's basics curriculum (a versioned list, below).
//     "Practice the basics" assignments may only use foundation concepts the
//     learner's skill checklist permits.
//   - advanced: anything beyond the basics. "Stretch out" assignments require
//     exactly 1–3 of these. Requests, assignments and matching always use these
//     ids, never raw wording ("fetch from an API" and "make an HTTP request"
//     both resolve to `http-json-api` through its aliases).
//
// "Beyond the basics" is about curriculum coverage, not about the learner: a
// learner who already knows classes still counts classes as one advanced
// concept. Nothing here changes per learner.
//
// Detectors are heuristics run over code with string literals and comments
// blanked out (see staticAnalysis.ts). They back two checks, both described to
// learners and authors as "code checks", not proof: generation validation
// (does the reference solution use a concept it didn't declare?) and concept
// evidence on a learner's submission (does the code actually use the required
// concept?). Foundation detectors are deliberately few and conservative.
//
// Bump the version when the basics list or any concept's classification
// changes. Assignments record the version they were validated against.

export const BASICS_CURRICULUM_VERSION = '2026.10-1';

export type PracticeLanguage = 'python' | 'typescript' | 'cpp' | 'java';
export type PracticeMode = 'basics' | 'stretch';
export type PracticeScope = 'small' | 'medium' | 'large';

export const PRACTICE_LANGUAGES: PracticeLanguage[] = ['python', 'java', 'cpp', 'typescript'];
/** In the catalog but not offered to learners at launch (admins still see it). */
export const HIDDEN_PRACTICE_LANGUAGES: PracticeLanguage[] = ['typescript'];
export const PRACTICE_SCOPES: PracticeScope[] = ['small', 'medium', 'large'];
export const MAX_STRETCH_CONCEPTS = 3;

/** A code detector: a regex tested against stripped code, or a custom check. */
export type Detector = RegExp | ((strippedCode: string) => boolean);

export interface FoundationConcept {
  id: string;
  name: string;
  description: string;
  /** Usage detectors (conservative). Empty = never flagged by static checks. */
  detect: Detector[];
}

export interface AdvancedConcept {
  id: string;
  name: string;
  description: string;
  aliases: string[];
  /** Foundation concepts the learner must be permitted to use. */
  requiresFoundation: string[];
  /** Other advanced concepts that must be part of the same assignment. */
  requiresAdvanced: string[];
  /** Advanced concepts this one can't be combined with, and why. */
  incompatibleWith: { id: string; reason: string }[];
  /** Any match counts as evidence the code uses this concept. */
  evidence: Detector[];
  /** Plain-language version of the evidence check, shown to learners. */
  evidenceLabel: string;
  /** Extra instructions for generation (fixtures, mocks, determinism). */
  generationNotes?: string;
}

export interface LanguageCatalog {
  language: PracticeLanguage;
  label: string;
  fileExtension: string;
  foundation: FoundationConcept[];
  advanced: AdvancedConcept[];
  /** Foundation concepts each scope needs at minimum. */
  minFoundationForScope: Record<PracticeScope, string[]>;
  /** Which course topics teach which foundation concepts (for the default checklist). */
  courseTopicFoundation: Record<string, Record<number, string[]>>;
  /** How programs read input and how the provided mock API works, for generation. */
  runtimeNotes: string;
}

// ---- Shared detectors ----

/** The body of a Python function: the following lines indented deeper than its `def`. */
function pythonBody(code: string, defIndex: number): string {
  const lineStart = code.lastIndexOf('\n', defIndex) + 1;
  const indent = (code.slice(lineStart).match(/^[ \t]*/) ?? [''])[0].length;
  const after = code.slice(code.indexOf('\n', defIndex) + 1).split('\n');
  const body: string[] = [];
  for (const line of after) {
    if (line.trim() === '') {
      body.push(line);
      continue;
    }
    if ((line.match(/^[ \t]*/) ?? [''])[0].length <= indent) break;
    body.push(line);
  }
  return body.join('\n');
}

/** The body of a brace-delimited function: from its first `{` to the matching `}`. */
function braceBody(code: string, fromIndex: number): string {
  const open = code.indexOf('{', fromIndex);
  if (open < 0) return '';
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    if (code[i] === '{') depth++;
    else if (code[i] === '}' && --depth === 0) return code.slice(open + 1, i);
  }
  return code.slice(open + 1);
}

/**
 * A function that calls itself by name inside its own body. Calls after the
 * definition (like `main()` at the bottom of a script) don't count.
 */
function selfCallingFunction(defPattern: RegExp, style: 'indent' | 'braces' | 'arrow'): (code: string) => boolean {
  return (code) => {
    for (const m of code.matchAll(defPattern)) {
      const name = m[1];
      const start = m.index ?? 0;
      const end = start + m[0].length;
      let body: string;
      if (style === 'indent') body = pythonBody(code, start);
      else if (style === 'braces') body = braceBody(code, end - 1);
      else {
        // An arrow function: a braced body, or a single expression up to the end of the statement.
        const rest = code.slice(end);
        const lead = rest.length - rest.trimStart().length;
        body = rest.trimStart().startsWith('{') ? braceBody(code, end + lead) : rest.split(/;|\n/)[0];
      }
      if (new RegExp(`\\b${name}\\s*\\(`).test(body)) return true;
    }
    return false;
  };
}

const HTTP_ALIASES = [
  'http',
  'http request',
  'http requests',
  'make an http request',
  'fetch from an api',
  'fetch data from an api',
  'call an api',
  'calling an api',
  'web api',
  'rest api',
  'api',
  'apis',
  'fetch',
  'requests',
];

// ---- Python ----

const PYTHON: LanguageCatalog = {
  language: 'python',
  label: 'Python',
  fileExtension: 'py',
  // Python's basics curriculum is the Python: Beginner course outline.
  foundation: [
    { id: 'output-variables', name: 'Values, variables, output and types', description: 'print(), variables and assignment, int/float/str/bool values, type()', detect: [] },
    { id: 'input-conversion', name: 'Input and type conversion', description: 'input(), int(), float(), str(), reading one value per line', detect: [/\binput\s*\(/] },
    { id: 'operators', name: 'Operators and expressions', description: 'arithmetic (+ - * / // % **), comparison and boolean operators', detect: [] },
    { id: 'conditionals', name: 'Decisions and conditional logic', description: 'if / elif / else, nested conditions', detect: [/^\s*(if|elif)\b/m] },
    { id: 'strings', name: 'String processing', description: 'indexing, slicing, len(), upper/lower/strip/split/join/replace/find, f-strings', detect: [] },
    { id: 'lists', name: 'Lists and sequence basics', description: 'list literals, indexing, append/insert/pop/remove, len, in, sorted(), min/max/sum', detect: [/\.(append|insert|pop|remove)\s*\(/, /=\s*\[\s*\]/] },
    { id: 'loops', name: 'Loops and basic algorithms', description: 'for over a sequence or range(), while, counting/summing/finding patterns', detect: [/^\s*(for|while)\b/m] },
    { id: 'functions', name: 'Functions and scope', description: 'def, parameters, return values, local vs global scope', detect: [/^\s*def\s+\w+\s*\(/m] },
    { id: 'exceptions-basic', name: 'Basic exception handling', description: 'try / except ValueError and similar, keeping a program from crashing on bad input', detect: [/^\s*try\s*:/m] },
  ],
  advanced: [
    {
      id: 'dicts', name: 'Dictionaries', description: 'key–value data with dict literals, lookup, .get(), .items() and updating counts',
      aliases: ['dict', 'dictionary', 'dictionaries', 'hash map', 'key value', 'key-value pairs', 'mapping'],
      requiresFoundation: ['output-variables'], requiresAdvanced: [], incompatibleWith: [],
      evidence: [/\{\s*\}/, /\{[^{}]*:[^{}]*\}/, /\bdict\s*\(/, /\.(items|keys|values|get|setdefault)\s*\(/],
      evidenceLabel: 'Code creates or reads a dictionary',
    },
    {
      id: 'sets', name: 'Sets', description: 'set(), membership, add/discard, union/intersection/difference for de-duplication and comparison',
      aliases: ['set', 'sets', 'unique values', 'deduplicate', 'set operations'],
      requiresFoundation: ['lists'], requiresAdvanced: [], incompatibleWith: [],
      evidence: [/\bset\s*\(/, /\.(add|discard|union|intersection|difference|issubset)\s*\(/],
      evidenceLabel: 'Code creates or operates on a set',
    },
    {
      id: 'comprehensions', name: 'Comprehensions', description: 'list, dict and set comprehensions with optional filters',
      aliases: ['comprehension', 'list comprehension', 'list comprehensions', 'dict comprehension'],
      requiresFoundation: ['loops', 'lists'], requiresAdvanced: [], incompatibleWith: [],
      evidence: [/\[[^\[\]]*\bfor\b[^\[\]]*\bin\b[^\[\]]*\]/, /\{[^{}]*\bfor\b[^{}]*\bin\b[^{}]*\}/],
      evidenceLabel: 'Code uses a comprehension',
    },
    {
      id: 'lambda-sorting', name: 'Sorting with key functions', description: 'sorted()/list.sort() with key= and lambda, multi-level sorting, reverse=',
      aliases: ['lambda', 'lambdas', 'sort by key', 'custom sort', 'sorting', 'key function'],
      requiresFoundation: ['lists', 'functions'], requiresAdvanced: [], incompatibleWith: [],
      // key= as a keyword argument, not a variable that happens to be called "key".
      evidence: [/\blambda\b/, /[(,]\s*key\s*=/],
      evidenceLabel: 'Code sorts with a key function or lambda',
    },
    {
      id: 'recursion', name: 'Recursion', description: 'functions that call themselves with a base case and a smaller sub-problem',
      aliases: ['recursive', 'recursive function', 'recursion'],
      requiresFoundation: ['functions', 'conditionals'], requiresAdvanced: [], incompatibleWith: [],
      evidence: [selfCallingFunction(/^[ \t]*def\s+(\w+)\s*\(/gm, 'indent')],
      evidenceLabel: 'A function calls itself',
    },
    {
      id: 'file-io', name: 'Reading and writing files', description: 'open() with modes, with-blocks, reading lines, writing output files',
      aliases: ['files', 'file', 'file io', 'file i/o', 'read a file', 'write a file', 'file processing', 'text files'],
      requiresFoundation: ['strings', 'loops'], requiresAdvanced: [], incompatibleWith: [],
      evidence: [/\bopen\s*\(/],
      evidenceLabel: 'Code opens a file',
      generationNotes: 'Provide the input data as fixture files in the working directory and reference them by relative path. Use expectedFiles for any file the program must write.',
    },
    {
      id: 'csv-data', name: 'CSV data', description: 'the csv module: reader/DictReader, writer/DictWriter',
      aliases: ['csv', 'csv files', 'spreadsheet data', 'comma separated'],
      requiresFoundation: ['strings', 'loops'], requiresAdvanced: ['file-io'], incompatibleWith: [],
      evidence: [/\bcsv\.(reader|writer|DictReader|DictWriter)\s*\(/],
      evidenceLabel: 'Code uses the csv module',
      generationNotes: 'Provide CSV fixture files; vary their contents per hidden test with per-test files.',
    },
    {
      id: 'json-data', name: 'JSON data', description: 'json.loads/json.dumps (and load/dump) to parse and produce JSON',
      aliases: ['json', 'parse json', 'serialize'],
      requiresFoundation: ['strings'], requiresAdvanced: ['dicts'], incompatibleWith: [],
      evidence: [/\bjson\.(loads?|dumps?)\s*\(/],
      evidenceLabel: 'Code parses or produces JSON with the json module',
    },
    {
      id: 'http-json-api', name: 'Calling an HTTP JSON API', description: 'requesting endpoints, checking status codes, parsing JSON responses, handling errors',
      aliases: HTTP_ALIASES,
      requiresFoundation: ['conditionals'], requiresAdvanced: ['json-data'],
      incompatibleWith: [{ id: 'asyncio', reason: "the practice API stand-in is synchronous, so it can't be awaited" }],
      evidence: [/\bmock_api\b/],
      evidenceLabel: 'Code requests data through the API client',
      generationNotes:
        'The sandbox has no network. Provide a fixture module mock_api.py exposing get(path) -> (status_code, body_text) and post(path, body_text) -> (status_code, body_text), backed by a dict of documented endpoints. Document every endpoint, its status codes and JSON shape in the prompt. Tests vary the data via per-test fixture files the mock reads (e.g. api_data.json).',
    },
    {
      id: 'classes', name: 'Classes and objects', description: 'class definitions, __init__, attributes, methods, creating and using instances',
      aliases: ['class', 'classes', 'objects', 'oop', 'object oriented', 'object-oriented programming'],
      requiresFoundation: ['functions'], requiresAdvanced: [], incompatibleWith: [],
      evidence: [/^\s*class\s+\w+/m],
      evidenceLabel: 'Code defines a class',
    },
    {
      id: 'inheritance', name: 'Inheritance', description: 'subclasses, overriding methods, super().__init__()',
      aliases: ['inheritance', 'subclass', 'subclasses', 'polymorphism'],
      requiresFoundation: ['functions'], requiresAdvanced: ['classes'], incompatibleWith: [],
      evidence: [/^\s*class\s+\w+\s*\(\s*[A-Za-z_]\w*\s*\)/m],
      evidenceLabel: 'Code defines a class that inherits from another',
    },
    {
      id: 'dataclasses', name: 'Dataclasses', description: '@dataclass for simple record types, default values, field()',
      aliases: ['dataclass', 'dataclasses', 'records'],
      requiresFoundation: ['functions'], requiresAdvanced: ['classes'], incompatibleWith: [],
      evidence: [/@dataclass\b/],
      evidenceLabel: 'Code uses @dataclass',
    },
    {
      id: 'custom-exceptions', name: 'Custom exceptions', description: 'defining exception classes, raise, catching specific errors, finally',
      aliases: ['custom exception', 'custom exceptions', 'raise', 'raising errors', 'error classes'],
      requiresFoundation: ['exceptions-basic', 'functions'], requiresAdvanced: ['classes'], incompatibleWith: [],
      evidence: [/^\s*class\s+\w+\s*\(\s*\w*(Exception|Error)\s*\)/m],
      evidenceLabel: 'Code defines its own exception class',
    },
    {
      id: 'generators', name: 'Generators', description: 'yield, generator functions, lazy iteration',
      aliases: ['generator', 'generators', 'yield', 'lazy iteration', 'iterators'],
      requiresFoundation: ['functions', 'loops'], requiresAdvanced: [], incompatibleWith: [],
      evidence: [/\byield\b/],
      evidenceLabel: 'Code defines a generator with yield',
    },
    {
      id: 'decorators', name: 'Decorators', description: 'writing a function that wraps another, applying it with @',
      aliases: ['decorator', 'decorators', 'wrapper functions'],
      requiresFoundation: ['functions'], requiresAdvanced: [], incompatibleWith: [],
      evidence: [/^\s*@(?!dataclass\b|property\b|staticmethod\b|classmethod\b)\w+/m],
      evidenceLabel: 'Code applies its own decorator',
    },
    {
      id: 'regex', name: 'Regular expressions', description: 'the re module: search, match, findall, sub, groups',
      aliases: ['regex', 'regular expression', 'regular expressions', 'pattern matching', 're module'],
      requiresFoundation: ['strings'], requiresAdvanced: [], incompatibleWith: [],
      evidence: [/\bre\.(match|search|findall|finditer|sub|compile|fullmatch|split)\s*\(/],
      evidenceLabel: 'Code uses the re module',
    },
    {
      id: 'datetime', name: 'Dates and times', description: 'datetime/date/timedelta: parsing, formatting and date arithmetic',
      aliases: ['dates', 'date', 'time', 'datetime', 'timedelta', 'date arithmetic'],
      requiresFoundation: ['strings'], requiresAdvanced: [], incompatibleWith: [],
      // The import, not the word: a variable called "date" isn't the datetime module.
      evidence: [/^\s*(from\s+datetime\s+import|import\s+datetime)\b/m],
      evidenceLabel: 'Code uses datetime',
      generationNotes: 'Never depend on the current date or time; every date comes from input or fixtures.',
    },
    {
      id: 'collections-module', name: 'The collections module', description: 'Counter, defaultdict, deque, namedtuple',
      aliases: ['collections', 'counter', 'defaultdict', 'deque', 'namedtuple'],
      requiresFoundation: ['lists'], requiresAdvanced: ['dicts'], incompatibleWith: [],
      evidence: [/\b(Counter|defaultdict|deque|namedtuple)\s*\(/],
      evidenceLabel: 'Code uses Counter, defaultdict, deque or namedtuple',
    },
    {
      id: 'type-hints', name: 'Type hints', description: 'annotating parameters, return values and variables',
      aliases: ['type hints', 'type annotations', 'typing', 'annotations'],
      requiresFoundation: ['functions'], requiresAdvanced: [], incompatibleWith: [],
      evidence: [/def\s+\w+\s*\([^)]*\w\s*:\s*[\w\[]/, /\)\s*->\s*[\w\[]/],
      evidenceLabel: 'Code annotates function parameters or return types',
    },
    {
      id: 'asyncio', name: 'Async with asyncio', description: 'async def, await, asyncio.run and gather',
      aliases: ['async', 'asyncio', 'await', 'concurrency', 'coroutines'],
      requiresFoundation: ['functions'], requiresAdvanced: [],
      incompatibleWith: [{ id: 'http-json-api', reason: "the practice API stand-in is synchronous, so it can't be awaited" }],
      evidence: [/\basync\s+def\b/, /\bawait\b/],
      evidenceLabel: 'Code defines and awaits coroutines',
      generationNotes: 'Keep output deterministic: no wall-clock timing, only asyncio.sleep(0) or awaited results.',
    },
  ],
  minFoundationForScope: {
    small: ['output-variables', 'input-conversion'],
    medium: ['output-variables', 'input-conversion', 'conditionals', 'loops'],
    large: ['output-variables', 'input-conversion', 'conditionals', 'loops', 'lists', 'functions'],
  },
  courseTopicFoundation: {
    python_beginner: {
      2: ['output-variables'],
      3: ['input-conversion'],
      4: ['operators'],
      5: ['conditionals'],
      6: ['strings'],
      7: ['lists'],
      8: ['loops'],
      9: ['functions'],
      10: ['exceptions-basic'],
    },
  },
  runtimeNotes:
    'Programs are a single file, solution.py, run with Python 3 from its own working directory. Write a plain top-level script (no if __name__ == "__main__" guard, and only define functions if functions are an allowed basic). Tests pipe text to stdin and compare stdout (trailing whitespace ignored). Fixture files sit next to solution.py and are opened by relative path. Standard library only; no network, no current date/time, no randomness without a fixed seed.',
};

// ---- TypeScript ----

const TYPESCRIPT: LanguageCatalog = {
  language: 'typescript',
  label: 'TypeScript',
  fileExtension: 'ts',
  // TypeScript's basics curriculum is Part I of the TypeScript course plus
  // functions, and reading stdin (which every practice program needs).
  foundation: [
    { id: 'io-variables', name: 'Variables, primitive types and output', description: 'let/const, number/string/boolean, type annotations and inference, console.log', detect: [] },
    { id: 'reading-input', name: 'Reading input', description: "readFileSync(0, 'utf8') to read stdin, splitting lines, Number()", detect: [/readFileSync\s*\(\s*0\s*[,)]/] },
    { id: 'operators', name: 'Operators and conversion', description: 'arithmetic, comparison, logical operators, Number()/String() conversion, template literals', detect: [] },
    { id: 'strings', name: 'Strings and text processing', description: 'length, indexing, slice, split/join, trim, toUpperCase, includes, replace', detect: [] },
    { id: 'arrays', name: 'Arrays and tuples', description: 'typed arrays, push/pop, indexing, length, includes, readonly arrays, tuples', detect: [/\.(push|pop|shift|unshift|splice)\s*\(/] },
    { id: 'objects', name: 'Objects and structural typing', description: 'object literals, property access, type aliases and interfaces for object shapes', detect: [] },
    { id: 'conditionals', name: 'Conditional logic and basic narrowing', description: 'if/else, switch, ternary, typeof checks on simple values', detect: [/\b(if|switch)\s*\(/] },
    { id: 'loops', name: 'Loops and iteration', description: 'for, for...of, while, counting and accumulating', detect: [/\b(for|while)\s*\(/] },
    { id: 'functions', name: 'Functions, parameters and return types', description: 'function declarations, arrow functions, typed parameters and returns, optional/default parameters', detect: [/\bfunction\s+\w+\s*\(/, /=\s*(\([^()]*\)|\w+)\s*(:\s*[\w<>\[\]|]+\s*)?=>/] },
  ],
  advanced: [
    {
      id: 'unions-narrowing', name: 'Unions and narrowing', description: 'union and literal types, discriminated unions, narrowing with typeof/in/discriminant checks',
      aliases: ['union', 'unions', 'union types', 'narrowing', 'discriminated union', 'discriminated unions', 'literal types', 'type guards'],
      requiresFoundation: ['conditionals', 'objects'], requiresAdvanced: [], incompatibleWith: [],
      evidence: [/\btype\s+\w+\s*=\s*[^;]*\|/, /:\s*[A-Za-z_][\w<>\[\]]*\s*\|\s*[A-Za-z_'"]/],
      evidenceLabel: 'Code declares a union type',
    },
    {
      id: 'generics', name: 'Generics', description: 'generic functions and types with type parameters and constraints',
      aliases: ['generic', 'generics', 'type parameters', 'generic functions'],
      requiresFoundation: ['functions'], requiresAdvanced: [], incompatibleWith: [],
      evidence: [/\bfunction\s+\w+\s*<\s*[A-Z]/, /=\s*<\s*[A-Z]\w*(\s+extends[^>]*)?>\s*\(/, /\b(type|interface|class)\s+\w+\s*<\s*[A-Z]/],
      evidenceLabel: 'Code declares its own generic function or type',
    },
    {
      id: 'classes', name: 'Classes', description: 'class declarations, constructors, fields, methods, access modifiers',
      aliases: ['class', 'classes', 'objects', 'oop', 'object oriented', 'object-oriented programming'],
      requiresFoundation: ['functions', 'objects'], requiresAdvanced: [], incompatibleWith: [],
      evidence: [/\bclass\s+\w+/],
      evidenceLabel: 'Code defines a class',
    },
    {
      id: 'error-handling', name: 'Errors and exceptions', description: 'throw new Error, try/catch with unknown errors, custom Error subclasses',
      aliases: ['errors', 'exceptions', 'try catch', 'error handling', 'throw'],
      requiresFoundation: ['functions', 'conditionals'], requiresAdvanced: [], incompatibleWith: [],
      evidence: [/\btry\s*\{/, /\bthrow\s+new\b/],
      evidenceLabel: 'Code throws or catches errors',
    },
    {
      id: 'array-methods', name: 'map, filter and reduce', description: 'transforming collections with map/filter/reduce/some/every and callbacks',
      aliases: ['map', 'filter', 'reduce', 'array methods', 'functional', 'higher order functions', 'higher-order functions'],
      requiresFoundation: ['arrays', 'functions'], requiresAdvanced: [], incompatibleWith: [],
      evidence: [/\.(map|filter|reduce|flatMap)\s*\(/],
      evidenceLabel: 'Code uses map, filter or reduce',
    },
    {
      id: 'map-set', name: 'Map and Set', description: 'Map and Set collections: get/set/has/delete, iteration, counting and de-duplication',
      aliases: ['map collection', 'set', 'sets', 'hash map', 'dictionary', 'maps'],
      requiresFoundation: ['loops'], requiresAdvanced: [], incompatibleWith: [],
      evidence: [/\bnew\s+(Map|Set)\s*[<(]/],
      evidenceLabel: 'Code creates a Map or Set',
    },
    {
      id: 'sorting-comparators', name: 'Sorting with comparators', description: 'Array.prototype.sort with a compare function, multi-key sorting',
      aliases: ['sorting', 'sort', 'comparator', 'custom sort'],
      requiresFoundation: ['arrays', 'functions'], requiresAdvanced: [], incompatibleWith: [],
      evidence: [/\.sort\s*\(\s*(\(|function|\w+\s*=>)/],
      evidenceLabel: 'Code sorts with a compare function',
    },
    {
      id: 'recursion', name: 'Recursion', description: 'functions that call themselves with a base case',
      aliases: ['recursive', 'recursion', 'recursive function'],
      requiresFoundation: ['functions', 'conditionals'], requiresAdvanced: [], incompatibleWith: [],
      evidence: [
        selfCallingFunction(/\bfunction\s+(\w+)\s*[<(]/g, 'braces'),
        selfCallingFunction(/\bconst\s+(\w+)\s*=\s*(?:\([^()]*\)|\w+)\s*(?::\s*[^=]+)?=>/g, 'arrow'),
      ],
      evidenceLabel: 'A function calls itself',
    },
    {
      id: 'async-await', name: 'Promises and async/await', description: 'async functions, await, Promise.all, typing Promise<T>',
      aliases: ['async', 'await', 'async await', 'promises', 'promise', 'asynchronous'],
      requiresFoundation: ['functions'], requiresAdvanced: [], incompatibleWith: [],
      evidence: [/\basync\b/, /\bawait\b/, /\bnew\s+Promise\b/],
      evidenceLabel: 'Code uses async/await or promises',
      generationNotes: 'Wrap top-level flow in (async () => { ... })(); top-level await is not available. Keep output deterministic.',
    },
    {
      id: 'json-validation', name: 'JSON and runtime validation', description: 'JSON.parse into unknown, checking shapes with type guards before use',
      aliases: ['json', 'parse json', 'validation', 'runtime validation', 'unknown'],
      requiresFoundation: ['objects', 'conditionals'], requiresAdvanced: [], incompatibleWith: [],
      evidence: [/\bJSON\.parse\s*\(/],
      evidenceLabel: 'Code parses JSON',
    },
    {
      id: 'file-io', name: 'Reading and writing files', description: "node:fs readFileSync/writeFileSync with paths, processing file contents",
      aliases: ['files', 'file', 'file io', 'file i/o', 'read a file', 'write a file', 'file processing', 'fs'],
      requiresFoundation: ['strings', 'loops'], requiresAdvanced: [], incompatibleWith: [],
      evidence: [/\b(readFileSync|writeFileSync|appendFileSync)\s*\(\s*(?!0\s*[,)])/],
      evidenceLabel: 'Code reads or writes a named file',
      generationNotes: 'Provide input files as fixtures referenced by relative path; use expectedFiles for files the program writes.',
    },
    {
      id: 'http-json-api', name: 'Calling an HTTP JSON API', description: 'requesting endpoints, checking status codes, parsing and validating JSON responses',
      aliases: HTTP_ALIASES,
      requiresFoundation: ['conditionals', 'objects'], requiresAdvanced: ['async-await', 'json-validation'], incompatibleWith: [],
      evidence: [/\bmock_api\b/],
      evidenceLabel: 'Code requests data through the API client',
      generationNotes:
        "The sandbox has no network. Provide a fixture module mock_api.ts exporting async function get(path: string): Promise<{ status: number; body: string }> (and post if needed), backed by documented endpoints. The learner imports it with import { get } from './mock_api'. Vary data per hidden test with per-test fixture files the mock reads.",
    },
    {
      id: 'regex', name: 'Regular expressions', description: 'RegExp literals, test/match/replace with patterns and groups',
      aliases: ['regex', 'regular expression', 'regular expressions', 'pattern matching'],
      requiresFoundation: ['strings'], requiresAdvanced: [], incompatibleWith: [],
      evidence: [/\.(test|exec|matchAll)\s*\(/, /\bnew\s+RegExp\s*\(/, /\.(match|replace|split)\s*\(\s*\/[^/]/],
      evidenceLabel: 'Code uses a regular expression',
    },
  ],
  minFoundationForScope: {
    small: ['io-variables', 'reading-input'],
    medium: ['io-variables', 'reading-input', 'conditionals', 'loops'],
    large: ['io-variables', 'reading-input', 'conditionals', 'loops', 'arrays', 'functions'],
  },
  courseTopicFoundation: {},
  runtimeNotes:
    "Programs are a single file, solution.ts, transpiled with esbuild (types stripped, not checked) and run on Node 20 as CommonJS from its own working directory. Read stdin with readFileSync(0, 'utf8') from 'fs'. Tests compare stdout (trailing whitespace ignored). Fixture files sit next to the solution. No npm packages, no network, no current date/time, no unseeded randomness.",
};

// ---- C++ ----

const CPP: LanguageCatalog = {
  language: 'cpp',
  label: 'C++',
  fileExtension: 'cpp',
  // C++ has no course yet; its basics are the usual first-course fundamentals.
  foundation: [
    { id: 'io-variables', name: 'Input/output and variables', description: 'cin/cout, getline, int/double/char/bool/string variables', detect: [] },
    { id: 'operators', name: 'Operators and expressions', description: 'arithmetic, comparison and logical operators, casts between numeric types', detect: [] },
    { id: 'conditionals', name: 'Conditionals', description: 'if/else, switch', detect: [/\b(if|switch)\s*\(/] },
    { id: 'loops', name: 'Loops', description: 'for, while, do-while, range-based for', detect: [/\b(for|while)\s*\(/] },
    { id: 'strings', name: 'std::string basics', description: 'length, indexing, substr, find, concatenation, character checks', detect: [] },
    { id: 'vectors-arrays', name: 'Vectors and arrays', description: 'std::vector push_back/size/indexing, fixed arrays', detect: [/\bvector\s*</, /\.push_back\s*\(/] },
    { id: 'functions', name: 'Functions', description: 'function definitions, parameters by value, return values, prototypes', detect: [/^\s*(?!return\b|else\b)[\w:<>,*& ]+\s+(?!main\b)(?!if\b|for\b|while\b|switch\b)\w+\s*\([^;{}]*\)\s*(const\s*)?\{/m] },
  ],
  advanced: [
    {
      id: 'structs-classes', name: 'Structs and classes', description: 'struct/class definitions, constructors, member functions, access control',
      aliases: ['struct', 'structs', 'class', 'classes', 'objects', 'oop', 'object oriented', 'object-oriented programming'],
      requiresFoundation: ['functions'], requiresAdvanced: [], incompatibleWith: [],
      evidence: [/\b(struct|class)\s+\w+\s*(final\s*)?[:{]/],
      evidenceLabel: 'Code defines a struct or class',
    },
    {
      id: 'inheritance', name: 'Inheritance and virtual functions', description: 'derived classes, virtual/override, base-class pointers or references',
      aliases: ['inheritance', 'polymorphism', 'virtual functions', 'subclass'],
      requiresFoundation: ['functions'], requiresAdvanced: ['structs-classes'], incompatibleWith: [],
      evidence: [/\b(class|struct)\s+\w+\s*:\s*(public|protected|private)?\s*\w+/],
      evidenceLabel: 'Code defines a class that inherits from another',
    },
    {
      id: 'maps', name: 'std::map and unordered_map', description: 'key–value lookup, counting, iteration over pairs',
      aliases: ['map', 'maps', 'unordered_map', 'hash map', 'dictionary', 'key value'],
      requiresFoundation: ['loops'], requiresAdvanced: [], incompatibleWith: [],
      evidence: [/\b(unordered_)?map\s*</],
      evidenceLabel: 'Code uses std::map or unordered_map',
    },
    {
      id: 'sets', name: 'std::set and unordered_set', description: 'unique values, membership tests, ordered iteration',
      aliases: ['set', 'sets', 'unordered_set', 'unique values'],
      requiresFoundation: ['loops'], requiresAdvanced: [], incompatibleWith: [],
      evidence: [/\b(unordered_)?set\s*</],
      evidenceLabel: 'Code uses std::set or unordered_set',
    },
    {
      id: 'references-pointers', name: 'References and pointers', description: 'pass-by-reference, const references, pointers, the -> operator',
      aliases: ['pointers', 'references', 'pass by reference', 'pointer'],
      requiresFoundation: ['functions'], requiresAdvanced: [], incompatibleWith: [],
      evidence: [/\(\s*[^()]*\w\s*&\s*\w+/, /->/, /\w+\s*\*\s*\w+\s*=/],
      evidenceLabel: 'Code passes by reference or uses pointers',
    },
    {
      id: 'stl-algorithms', name: 'STL algorithms and lambdas', description: 'std::sort with comparators, find_if, count_if, accumulate, lambdas',
      aliases: ['algorithms', 'stl', 'stl algorithms', 'lambda', 'lambdas', 'sorting', 'sort', 'comparator'],
      requiresFoundation: ['vectors-arrays', 'functions'], requiresAdvanced: [], incompatibleWith: [],
      evidence: [/\b(std::)?(sort|stable_sort|find_if|count_if|accumulate|transform|max_element|min_element|remove_if|any_of|all_of)\s*\(/],
      evidenceLabel: 'Code uses an STL algorithm',
    },
    {
      id: 'recursion', name: 'Recursion', description: 'functions that call themselves with a base case',
      aliases: ['recursive', 'recursion', 'recursive function'],
      requiresFoundation: ['functions', 'conditionals'], requiresAdvanced: [], incompatibleWith: [],
      evidence: [selfCallingFunction(/^[ \t]*[\w:<>,*& ]+\s+(?!main\b)(\w+)\s*\([^;{}]*\)\s*\{/gm, 'braces')],
      evidenceLabel: 'A function calls itself',
    },
    {
      id: 'file-io', name: 'File streams', description: 'ifstream/ofstream: reading lines and writing output files',
      aliases: ['files', 'file', 'file io', 'file i/o', 'fstream', 'read a file', 'write a file', 'file processing'],
      requiresFoundation: ['strings', 'loops'], requiresAdvanced: [], incompatibleWith: [],
      evidence: [/\b(ifstream|ofstream|fstream)\b/],
      evidenceLabel: 'Code opens a file stream',
      generationNotes: 'Provide input files as fixtures referenced by relative path; use expectedFiles for files the program writes.',
    },
    {
      id: 'string-streams', name: 'String streams', description: 'stringstream/istringstream for parsing and formatting',
      aliases: ['stringstream', 'string streams', 'parsing', 'istringstream'],
      requiresFoundation: ['strings'], requiresAdvanced: [], incompatibleWith: [],
      evidence: [/\b(stringstream|istringstream|ostringstream)\b/],
      evidenceLabel: 'Code uses a string stream',
    },
    {
      id: 'exceptions', name: 'Exceptions', description: 'throw, try/catch, standard exception types',
      aliases: ['exceptions', 'errors', 'try catch', 'error handling', 'throw'],
      requiresFoundation: ['functions', 'conditionals'], requiresAdvanced: [], incompatibleWith: [],
      evidence: [/\btry\s*\{/, /\bthrow\b/],
      evidenceLabel: 'Code throws or catches exceptions',
    },
    {
      id: 'templates', name: 'Templates', description: 'function and class templates',
      aliases: ['template', 'templates', 'generics', 'generic'],
      requiresFoundation: ['functions'], requiresAdvanced: [], incompatibleWith: [],
      evidence: [/\btemplate\s*</],
      evidenceLabel: 'Code declares a template',
    },
    {
      id: 'smart-pointers', name: 'Smart pointers', description: 'unique_ptr and shared_ptr ownership, make_unique/make_shared',
      aliases: ['smart pointers', 'unique_ptr', 'shared_ptr', 'memory management'],
      requiresFoundation: ['functions'], requiresAdvanced: ['references-pointers'], incompatibleWith: [],
      evidence: [/\b(unique_ptr|shared_ptr|make_unique|make_shared)\b/],
      evidenceLabel: 'Code uses a smart pointer',
    },
  ],
  minFoundationForScope: {
    small: ['io-variables'],
    medium: ['io-variables', 'conditionals', 'loops'],
    large: ['io-variables', 'conditionals', 'loops', 'vectors-arrays', 'functions'],
  },
  courseTopicFoundation: {},
  runtimeNotes:
    'Programs are a single file, solution.cpp, compiled with g++ -std=c++17 -O2 and run from their own working directory. Read stdin with cin/getline, write stdout with cout. Tests compare stdout (trailing whitespace ignored). Fixture files (data files or headers) sit next to the source. Standard library only; no network, no current date/time, no unseeded randomness.',
};

// ---- Java ----

// A Java method definition: modifiers, return type, name (group 1), parameters, body.
const JAVA_METHOD =
  /^[ \t]*(?:(?:public|private|protected|static|final|synchronized)\s+)*[\w<>[\],.? ]+\s+(?!main\b)(\w+)\s*\([^;{}]*\)\s*(?:throws\s+[\w., ]+)?\{/gm;

const JAVA: LanguageCatalog = {
  language: 'java',
  label: 'Java',
  fileExtension: 'java',
  // Stand-in until the owner's Java concept list arrives: the usual
  // first-course fundamentals, mirroring the C++ list.
  foundation: [
    { id: 'io-variables', name: 'Input/output and variables', description: 'Scanner input, System.out output, int/double/char/boolean/String variables', detect: [] },
    { id: 'operators', name: 'Operators and expressions', description: 'arithmetic, comparison and logical operators, casting between number types', detect: [] },
    { id: 'conditionals', name: 'Conditionals', description: 'if/else, switch', detect: [/\b(if|switch)\s*\(/] },
    { id: 'loops', name: 'Loops', description: 'for, while, do-while, enhanced for', detect: [/\b(for|while)\s*\(/] },
    { id: 'strings', name: 'String basics', description: 'length, charAt, substring, indexOf, equals, concatenation, StringBuilder', detect: [] },
    { id: 'arrays-lists', name: 'Arrays and ArrayList', description: 'fixed arrays, ArrayList add/get/size, iterating over both', detect: [/\bArrayList\s*</, /\w+\s*\[\s*\]\s*\w+\s*=/] },
    { id: 'methods', name: 'Methods', description: 'static methods with parameters and return values', detect: [(code) => [...code.matchAll(JAVA_METHOD)].length > 0] },
  ],
  advanced: [
    {
      id: 'classes-objects', name: 'Classes and objects', description: 'your own classes: fields, constructors, instance methods, access modifiers',
      aliases: ['class', 'classes', 'objects', 'oop', 'object oriented', 'object-oriented programming', 'constructors'],
      requiresFoundation: ['methods'], requiresAdvanced: [], incompatibleWith: [],
      evidence: [(code) => (code.match(/\bclass\s+\w+/g) ?? []).length >= 2, /\bnew\s+(?!Scanner\b|ArrayList\b|HashMap\b|HashSet\b|StringBuilder\b|String\b|int\b|double\b)[A-Z]\w*\s*\(/],
      evidenceLabel: 'Code defines and uses a class of its own',
    },
    {
      id: 'inheritance-interfaces', name: 'Inheritance and interfaces', description: 'extends, implements, overriding methods, using a base type',
      aliases: ['inheritance', 'interfaces', 'interface', 'polymorphism', 'extends', 'implements', 'subclass', 'abstract class'],
      requiresFoundation: ['methods'], requiresAdvanced: ['classes-objects'], incompatibleWith: [],
      evidence: [/\bclass\s+\w+\s+(extends|implements)\s+\w+/, /\binterface\s+\w+/],
      evidenceLabel: 'Code defines an interface or a class that extends or implements another',
    },
    {
      id: 'hashmap', name: 'HashMap', description: 'key–value lookup, counting, iterating over entries',
      aliases: ['map', 'maps', 'hashmap', 'hash map', 'dictionary', 'key value', 'treemap'],
      requiresFoundation: ['loops'], requiresAdvanced: [], incompatibleWith: [],
      evidence: [/\b(Hash|Tree|LinkedHash)?Map\s*</],
      evidenceLabel: 'Code uses a Map',
    },
    {
      id: 'hashset', name: 'HashSet', description: 'unique values and fast membership tests',
      aliases: ['set', 'sets', 'hashset', 'unique values', 'treeset'],
      requiresFoundation: ['loops'], requiresAdvanced: [], incompatibleWith: [],
      evidence: [/\b(Hash|Tree|LinkedHash)?Set\s*</],
      evidenceLabel: 'Code uses a Set',
    },
    {
      id: 'sorting-comparators', name: 'Sorting and lambdas', description: 'Collections.sort / List.sort with comparators and lambda expressions',
      aliases: ['sorting', 'sort', 'comparator', 'comparators', 'lambda', 'lambdas'],
      requiresFoundation: ['arrays-lists', 'methods'], requiresAdvanced: [], incompatibleWith: [],
      evidence: [/\b(Collections|Arrays)\.sort\s*\(/, /\.sort\s*\(/, /\bComparator\b/],
      evidenceLabel: 'Code sorts a collection',
    },
    {
      id: 'streams', name: 'Streams', description: 'stream(), filter, map, collect, sum and friends',
      aliases: ['streams', 'stream api', 'functional', 'filter map reduce'],
      requiresFoundation: ['arrays-lists'], requiresAdvanced: [], incompatibleWith: [],
      evidence: [/\.stream\s*\(\s*\)/, /\bStream\.of\s*\(/],
      evidenceLabel: 'Code uses the Stream API',
    },
    {
      id: 'recursion', name: 'Recursion', description: 'methods that call themselves with a base case',
      aliases: ['recursive', 'recursion', 'recursive method', 'recursive function'],
      requiresFoundation: ['methods', 'conditionals'], requiresAdvanced: [], incompatibleWith: [],
      evidence: [selfCallingFunction(JAVA_METHOD, 'braces')],
      evidenceLabel: 'A method calls itself',
    },
    {
      id: 'file-io', name: 'Reading and writing files', description: 'Files.readAllLines/writeString, BufferedReader/FileWriter',
      aliases: ['files', 'file', 'file io', 'file i/o', 'read a file', 'write a file', 'file processing'],
      requiresFoundation: ['strings', 'loops'], requiresAdvanced: [], incompatibleWith: [],
      evidence: [/\bFiles\.\w+\s*\(/, /\b(FileReader|FileWriter|BufferedReader|BufferedWriter|PrintWriter)\b/],
      evidenceLabel: 'Code reads or writes a file',
      generationNotes: 'Provide input files as fixtures referenced by relative path; use expectedFiles for files the program writes.',
    },
    {
      id: 'exceptions', name: 'Exceptions', description: 'try/catch/finally, throwing, custom exception classes',
      aliases: ['exceptions', 'errors', 'try catch', 'error handling', 'throw'],
      requiresFoundation: ['methods', 'conditionals'], requiresAdvanced: [], incompatibleWith: [],
      evidence: [/\btry\s*\{/, /\bthrow\s+new\b/],
      evidenceLabel: 'Code throws or catches exceptions',
    },
    {
      id: 'generics', name: 'Generics', description: 'generic classes and methods with type parameters',
      aliases: ['generics', 'generic', 'type parameters'],
      requiresFoundation: ['methods'], requiresAdvanced: ['classes-objects'], incompatibleWith: [],
      evidence: [/\bclass\s+\w+\s*<\s*[A-Z]\w*/, /\bstatic\s+<\s*[A-Z]\w*\s*>/],
      evidenceLabel: 'Code declares a generic class or method',
    },
    {
      id: 'enums-records', name: 'Enums and records', description: 'enum types and record classes',
      aliases: ['enum', 'enums', 'record', 'records'],
      requiresFoundation: ['conditionals'], requiresAdvanced: [], incompatibleWith: [],
      evidence: [/\benum\s+\w+\s*\{/, /\brecord\s+\w+\s*\(/],
      evidenceLabel: 'Code defines an enum or record',
    },
  ],
  minFoundationForScope: {
    small: ['io-variables'],
    medium: ['io-variables', 'conditionals', 'loops'],
    large: ['io-variables', 'conditionals', 'loops', 'arrays-lists', 'methods'],
  },
  courseTopicFoundation: {},
  runtimeNotes:
    'Programs are a single file, Main.java, declaring public class Main with public static void main(String[] args). It is compiled with javac (JDK 17) and run as `java Main` from its own working directory. Read stdin with Scanner or BufferedReader, write stdout with System.out. Tests compare stdout (trailing whitespace ignored). Fixture files sit next to the source; provided .java helper classes are compiled with it. Standard library only; no network, no current date/time, no unseeded randomness.',
};

export const CATALOGS: Record<PracticeLanguage, LanguageCatalog> = { python: PYTHON, typescript: TYPESCRIPT, cpp: CPP, java: JAVA };

export function catalogFor(language: PracticeLanguage): LanguageCatalog {
  return CATALOGS[language];
}

export function advancedById(language: PracticeLanguage, id: string): AdvancedConcept | undefined {
  return CATALOGS[language].advanced.find((c) => c.id === id);
}

export function foundationById(language: PracticeLanguage, id: string): FoundationConcept | undefined {
  return CATALOGS[language].foundation.find((c) => c.id === id);
}

// ---- Scope definitions (shared by every language) ----

export interface ScopeDefinition {
  id: PracticeScope;
  label: string;
  description: string;
  requirements: { min: number; max: number };
  minTests: number;
  minHiddenTests: number;
  /** Large assignments are small projects with several connected deliverables. */
  minDeliverables: number;
}

export const SCOPES: Record<PracticeScope, ScopeDefinition> = {
  small: {
    id: 'small',
    label: 'Small',
    description: 'One focused task with a limited set of requirements.',
    requirements: { min: 2, max: 4 },
    minTests: 3,
    minHiddenTests: 2,
    minDeliverables: 1,
  },
  medium: {
    id: 'medium',
    label: 'Medium',
    description: 'A multi-step workflow that brings several requirements together.',
    requirements: { min: 4, max: 7 },
    minTests: 4,
    minHiddenTests: 2,
    minDeliverables: 1,
  },
  large: {
    id: 'large',
    label: 'Large',
    description: 'A small project with multiple connected tasks and deliverables.',
    requirements: { min: 6, max: 12 },
    minTests: 5,
    minHiddenTests: 3,
    minDeliverables: 2,
  },
};

// ---- Free-text concept lookup ----

function norm(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Resolve a concept id, name or alias (any case/punctuation) to an advanced concept id. */
export function resolveAdvancedConcept(language: PracticeLanguage, text: string): string | null {
  const q = norm(text);
  if (!q) return null;
  for (const c of CATALOGS[language].advanced) {
    if (norm(c.id) === q || norm(c.name) === q || c.aliases.some((a) => norm(a) === q)) return c.id;
  }
  return null;
}

/** Close matches for an unrecognized request, so the learner can pick one. */
export function suggestAdvancedConcepts(language: PracticeLanguage, text: string, limit = 3): string[] {
  const words = new Set(norm(text).split(' ').filter((w) => w.length > 2));
  if (words.size === 0) return [];
  return CATALOGS[language].advanced
    .map((c) => {
      const hay = new Set(norm([c.id, c.name, c.description, ...c.aliases].join(' ')).split(' '));
      return { id: c.id, score: [...words].filter((w) => hay.has(w)).length };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.id);
}
