import { diffLines } from 'diff';
import { SandboxLanguage } from './executionClient';

// Module 2 code review, algorithms/data structures finding: the original
// nearMissHint was "a fragile, order-dependent regex ladder" — ~80 lines of
// sequential if-checks, Python-specific (matched CPython's `NameError`/
// `SyntaxError` text) but not language-gated, so it could misfire on
// TypeScript or C++ output. Rebuilt as a data-driven, prioritized,
// language-gated rule table: each rule declares which language(s) it's
// valid for, evaluated in explicit priority order (ascending — lower runs
// first), first match wins. Behavior for Python is unchanged; the language
// gate is what's new, plus two real per-language rules (TypeScript, C++)
// proving the table actually extends, plus a real line-level diff for
// multi-line "basically right" output, which the original had no notion of
// at all (its case/whitespace checks only ever really made sense for
// single-line output).

export interface HintContext {
  actual: string;
  expected: string;
  errText: string;
  submittedCode: string;
  language: SandboxLanguage;
}

interface NormalizedContext {
  a: string; // actual, CRLF-normalized + trimmed
  e: string; // expected, CRLF-normalized + trimmed
  err: string;
  submittedCode: string;
  language: SandboxLanguage;
  outputMismatch: boolean; // a !== e && a !== '' — the "genuinely wrong output" gate the string-comparison rules share
}

interface HintRule {
  id: string;
  languages: SandboxLanguage[] | 'all';
  priority: number; // ascending; lower runs first
  test(ctx: NormalizedContext): string | undefined;
}

// Shared by every "missing string quotes" rule (Python/TypeScript/C++ each
// have their own error-text shape, but the underlying mistake and the check
// for it are identical): does the undefined/undeclared identifier actually
// appear as a word in the expected output? Guards against flagging an
// unrelated undefined-name error as a missing-quotes mistake.
function identifierAppearsInExpectedWords(identifier: string, expected: string): boolean {
  const word = identifier.toLowerCase();
  const expectedWords = expected.toLowerCase().split(/[^a-z0-9_]+/).filter(Boolean);
  return expectedWords.includes(word);
}

function firstLine(s: string): string {
  return s.replace(/\n$/, '').split('\n')[0];
}

// Blanks out string-literal contents and trailing comments on a line, for
// checks that care about code SHAPE (a `)` followed by a name, adjacent
// values with no comma) rather than content — shared by the two Python
// syntax-shape rules below, exactly as the original inline logic did.
function blankStringsAndComments(line: string): string {
  return line.replace(/(['"]).*?\1/g, '""').replace(/#.*$/, '');
}

// A real line-level diff for the "basically right" multi-line case — the
// original had nothing like this; its case/whitespace checks only ever
// really made sense for single-line output. Deliberately scoped to the one
// clean, common shape: exactly one line replaced with a different line,
// everything else identical. A different line COUNT (something inserted or
// deleted) or more than one differing line is a bigger structural
// difference than "basically right" — fall back to no hint rather than
// guess at a confusing message for a shape this wasn't designed for.
function multiLineDiffHint(expected: string, actual: string): string | undefined {
  if (!expected.includes('\n') && !actual.includes('\n')) return undefined;

  const changes = diffLines(expected, actual);
  let lineNum = 1;
  for (let i = 0; i < changes.length; i++) {
    const c = changes[i];
    if (c.removed) {
      const next = changes[i + 1];
      const isCleanSubstitution = c.count === 1 && !!next?.added && next.count === 1;
      const restAreCommon = changes.slice(i + 2).every((rest) => !rest.added && !rest.removed);
      if (isCleanSubstitution && restAreCommon) {
        const expectedLine = firstLine(c.value);
        const actualLine = firstLine(next!.value);
        return `Almost — most of the output matches, but line ${lineNum} differs: expected "${expectedLine}", got "${actualLine}".`;
      }
      return undefined; // a removed chunk that isn't this clean shape
    }
    if (c.added) return undefined; // a pure insertion with nothing removed before it
    lineNum += c.count; // common chunk — advances the expected-side line counter
  }
  return undefined;
}

const HINT_RULES: HintRule[] = [
  {
    id: 'py-two-statements-one-line',
    languages: ['python'],
    priority: 10,
    test: ({ err, submittedCode }) => {
      if (!/SyntaxError/i.test(err)) return undefined;
      for (const raw of (submittedCode ?? '').split('\n')) {
        if (/\)[ \t]*[A-Za-z_]/.test(blankStringsAndComments(raw))) {
          return 'Almost — it looks like two statements are on one line. In Python each statement goes on its own line: put the second call on a new line.';
        }
      }
      return undefined;
    },
  },
  {
    id: 'py-missing-quotes-nameerror',
    languages: ['python'],
    priority: 20,
    test: ({ err, e }) => {
      const match = err.match(/NameError: name '([^']+)' is not defined/);
      if (match && e && identifierAppearsInExpectedWords(match[1], e)) {
        return `Almost — it looks like some text is missing its quotation marks. \`${match[1]}\` has to be written \`"${match[1]}"\` so Python treats it as text, not a variable name.`;
      }
      return undefined;
    },
  },
  {
    // Verified against a real `tsc --strict` compile: `solution.ts(1,14): error TS2304: Cannot find name 'Denver'.`
    id: 'ts-missing-quotes-cannot-find-name',
    languages: ['typescript'],
    priority: 25,
    test: ({ err, e }) => {
      const match = err.match(/error TS2304: Cannot find name '([^']+)'/);
      if (match && e && identifierAppearsInExpectedWords(match[1], e)) {
        return `Almost — it looks like some text is missing its quotation marks. \`${match[1]}\` has to be written \`"${match[1]}"\` so TypeScript treats it as a string, not a reference to something named \`${match[1]}\`.`;
      }
      return undefined;
    },
  },
  {
    // Verified against a real g++ compile: `solution.cpp:3:18: error: 'Denver' was not declared in this scope`
    id: 'cpp-missing-quotes-undeclared',
    languages: ['cpp'],
    priority: 25,
    test: ({ err, e }) => {
      const match = err.match(/error: '([^']+)' was not declared in this scope/);
      if (match && e && identifierAppearsInExpectedWords(match[1], e)) {
        return `Almost — it looks like some text is missing its quotation marks. \`${match[1]}\` has to be written \`"${match[1]}"\` so C++ treats it as a string literal, not an undeclared name.`;
      }
      return undefined;
    },
  },
  {
    id: 'py-unterminated-string',
    languages: ['python'],
    priority: 30,
    test: ({ err, e }) =>
      /SyntaxError:.*(unterminated string|EOL while scanning|string literal)/i.test(err) && e
        ? 'Almost — it looks like a string is missing its closing quotation mark. Every `"` needs a matching `"` on the same line.'
        : undefined,
  },
  {
    id: 'py-missing-comma',
    languages: ['python'],
    priority: 40,
    test: ({ err, submittedCode }) => {
      if (!/SyntaxError/i.test(err)) return undefined;
      const forgotComma = /forgot a comma/i.test(err);
      const adjacentArgs = (submittedCode ?? '')
        .split('\n')
        .map(blankStringsAndComments)
        .some((line) => /\bprint\s*\(.*(""|\))[ \t]+["\w(].*\)/.test(line) && !/,/.test(line));
      return forgotComma || adjacentArgs
        ? 'Almost — it looks like a comma is missing between the values inside `print(...)`. Separate each value with a comma: `print("Total:", 15)`.'
        : undefined;
    },
  },
  {
    id: 'trailing-punctuation',
    languages: 'all',
    priority: 50,
    test: ({ a, e, outputMismatch }) => {
      if (!outputMismatch) return undefined;
      const trailingPunct = (s: string) => s.match(/[.!?,:;]+$/)?.[0] ?? '';
      const stripTrailingPunct = (s: string) => s.slice(0, s.length - trailingPunct(s).length);
      const [pa, pe] = [trailingPunct(a), trailingPunct(e)];
      if (pa === pe || stripTrailingPunct(a) !== stripTrailingPunct(e)) return undefined;
      if (!pa) return `Almost — the text is right, but the expected output ends with \`${pe}\` and yours doesn't.`;
      if (!pe) return `Almost — the text is right, but your output has an extra \`${pa}\` at the end that isn't expected.`;
      return `Almost — the text is right, but the punctuation at the very end differs (\`${pa}\` vs \`${pe}\` expected).`;
    },
  },
  {
    id: 'case-only',
    languages: 'all',
    priority: 60,
    test: ({ a, e, outputMismatch }) => {
      if (!outputMismatch) return undefined;
      const caseOnly = a.toLowerCase() === e.toLowerCase();
      const spaceOnly = a.replace(/\s+/g, ' ') === e.replace(/\s+/g, ' ');
      // caseOnly && spaceOnly is unreachable here (it would mean a === e,
      // already excluded by outputMismatch) — see 'both-case-and-whitespace'
      // below for the "both differ" case this rule doesn't cover.
      return caseOnly && !spaceOnly
        ? 'Almost — the text is right, but the capitalization is off. Check which letters should be upper- or lowercase.'
        : undefined;
    },
  },
  {
    id: 'whitespace-only',
    languages: 'all',
    priority: 70,
    test: ({ a, e, outputMismatch }) => {
      if (!outputMismatch) return undefined;
      const caseOnly = a.toLowerCase() === e.toLowerCase();
      const spaceOnly = a.replace(/\s+/g, ' ') === e.replace(/\s+/g, ' ');
      return spaceOnly && !caseOnly
        ? 'Almost — the words are right, but the spacing or line breaks differ from what was expected.'
        : undefined;
    },
  },
  {
    id: 'both-case-and-whitespace',
    languages: 'all',
    priority: 80,
    test: ({ a, e, outputMismatch }) => {
      if (!outputMismatch) return undefined;
      const both = a.toLowerCase().replace(/\s+/g, '') === e.toLowerCase().replace(/\s+/g, '');
      return both ? 'Very close — only capitalization and spacing separate your output from the expected one.' : undefined;
    },
  },
  {
    id: 'multi-line-diff',
    languages: 'all',
    priority: 90,
    test: ({ a, e, outputMismatch }) => (outputMismatch ? multiLineDiffHint(e, a) : undefined),
  },
];

// Exported for the priority-ordering/language-gating tests to introspect.
export { HINT_RULES };

// When a code submission fails, decide whether it's a near miss — the right
// idea with a small, easy-to-miss slip — and return a targeted hint.
// `undefined` means it's a genuine difference, so no special nudge.
export function nearMissHint(ctx: HintContext): string | undefined {
  const a = ctx.actual.replace(/\r\n/g, '\n').trim();
  const e = ctx.expected.replace(/\r\n/g, '\n').trim();
  const normalized: NormalizedContext = {
    a,
    e,
    err: ctx.errText ?? '',
    submittedCode: ctx.submittedCode,
    language: ctx.language,
    outputMismatch: a !== e && a !== '',
  };

  const applicable = HINT_RULES.filter(
    (rule) => rule.languages === 'all' || rule.languages.includes(ctx.language)
  ).sort((r1, r2) => r1.priority - r2.priority);

  for (const rule of applicable) {
    const hint = rule.test(normalized);
    if (hint) return hint;
  }
  return undefined;
}
