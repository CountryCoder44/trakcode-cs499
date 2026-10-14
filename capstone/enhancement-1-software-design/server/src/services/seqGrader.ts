import { SeqItem } from '../models/SeqTopic';
import { executeCode, ExecTestCase, SandboxLanguage } from './executionClient';

// Grades one Sequential Curriculum item submission. Pure-ish: talks to the
// execution sandbox for code items, does string/regex checks otherwise.

export interface SeqTestOutcome {
  label: string;
  input?: string;
  expected: string;
  actual: string;
  passed: boolean;
}
export interface SeqGradeResult {
  passed: boolean;
  // concept
  rationale?: string;
  ifIncorrect?: string;
  // code
  tests?: SeqTestOutcome[];
  stderr?: string;
  compileError?: string | null;
  // A "you're almost there" nudge when the output is wrong only in a small,
  // easy-to-miss way (capitalization / whitespace). Not set on a real mismatch.
  hint?: string;
  // local-verify / generic
  message?: string;
}

// Used only for `contains`-mode grading (substring match, not equality) —
// exact-output equality is decided sandbox-side by `gradeCode`'s `r.passed`,
// which the sandbox now computes via its own canonical
// services/execution-sandbox/src/utils/compareOutput.ts. This is a
// deliberately separate, less strict definition for a different comparison
// mode, but it must apply the same \r\n normalization invariant — the two
// can't share one module across the server/sandbox process boundary (they
// talk over HTTP, not a shared package), so keep them in sync by hand if the
// invariant ever changes.
const norm = (s: string) => s.replace(/\r\n/g, '\n').replace(/\s+$/g, '');

// When a code submission fails, decide whether it's a near miss — the right
// idea with a small, easy-to-miss slip — and return a targeted hint.
// `undefined` means it's a genuine difference, so no special nudge.
// Exported for unit testing (see __tests__/seqGrader.test.ts) — this is the
// "fragile, order-dependent regex ladder" flagged in the Module 2 code
// review; tests here are what makes future reordering a safe operation
// instead of a silent risk.
export function nearMissHint(
  actual: string,
  expected: string,
  errText: string,
  submittedCode: string
): string | undefined {
  const a = actual.replace(/\r\n/g, '\n').trim();
  const e = expected.replace(/\r\n/g, '\n').trim();
  const err = errText ?? '';

  // Two statements jammed onto one line (`print("a") print("b")`). Only when the
  // run failed with a SyntaxError. Check the submitted code line by line with
  // string contents blanked out, looking for a `)` followed by a new name —
  // which is never valid Python.
  if (/SyntaxError/i.test(err)) {
    for (const raw of (submittedCode ?? '').split('\n')) {
      const line = raw
        .replace(/(['"]).*?\1/g, '""') // blank simple string literals
        .replace(/#.*$/, ''); // drop a trailing comment
      if (/\)[ \t]*[A-Za-z_]/.test(line)) {
        return 'Almost — it looks like two statements are on one line. In Python each statement goes on its own line: put the second call on a new line.';
      }
    }
  }

  // "Forgot the quotes": a NameError on a word that appears in the expected
  // output — the learner wrote bare text where a string literal was needed
  // (`print(Hello)` instead of `print("Hello")`).
  const nameErr = err.match(/NameError: name '([^']+)' is not defined/);
  if (nameErr && e) {
    const word = nameErr[1].toLowerCase();
    const expectedWords = e.toLowerCase().split(/[^a-z0-9_]+/).filter(Boolean);
    if (expectedWords.includes(word)) {
      return `Almost — it looks like some text is missing its quotation marks. \`${nameErr[1]}\` has to be written \`"${nameErr[1]}"\` so Python treats it as text, not a variable name.`;
    }
  }

  // An unterminated string literal — a missing closing quote.
  if (/SyntaxError:.*(unterminated string|EOL while scanning|string literal)/i.test(err) && e) {
    return 'Almost — it looks like a string is missing its closing quotation mark. Every `"` needs a matching `"` on the same line.';
  }

  // "Forgot a comma": two values sitting side by side with no separator
  // (`print("Total:" 15)`) — a very common slip when printing a label next to
  // a number. Python 3.10+ says so in the error text; older messages just say
  // "invalid syntax", so also match a `print(...)` whose argument region (with
  // string contents blanked) has a string or `)` butting straight against the
  // next value with no comma.
  if (/SyntaxError/i.test(err)) {
    const forgotComma = /forgot a comma/i.test(err);
    const adjacentArgs = (submittedCode ?? '')
      .split('\n')
      .map((raw) => raw.replace(/(['"]).*?\1/g, '""').replace(/#.*$/, ''))
      .some((line) => /\bprint\s*\(.*(""|\))[ \t]+["\w(].*\)/.test(line) && !/,/.test(line));
    if (forgotComma || adjacentArgs) {
      return 'Almost — it looks like a comma is missing between the values inside `print(...)`. Separate each value with a comma: `print("Total:", 15)`.';
    }
  }

  if (a === e || a === '') return undefined;

  // Missing (or extra, or mismatched) trailing punctuation — everything else
  // matches, but the sentence-ending punctuation the expected text ends with
  // differs. A very easy slip when copying a phrase from the instructions
  // without noticing the period at the end.
  const trailingPunct = (s: string) => s.match(/[.!?,:;]+$/)?.[0] ?? '';
  const stripTrailingPunct = (s: string) => s.slice(0, s.length - trailingPunct(s).length);
  const [pa, pe] = [trailingPunct(a), trailingPunct(e)];
  if (pa !== pe && stripTrailingPunct(a) === stripTrailingPunct(e)) {
    if (!pa) return `Almost — the text is right, but the expected output ends with \`${pe}\` and yours doesn't.`;
    if (!pe) return `Almost — the text is right, but your output has an extra \`${pa}\` at the end that isn't expected.`;
    return `Almost — the text is right, but the punctuation at the very end differs (\`${pa}\` vs \`${pe}\` expected).`;
  }

  const caseOnly = a.toLowerCase() === e.toLowerCase();
  const spaceOnly = a.replace(/\s+/g, ' ') === e.replace(/\s+/g, ' ');
  const both = a.toLowerCase().replace(/\s+/g, '') === e.toLowerCase().replace(/\s+/g, '');

  if (caseOnly && spaceOnly) return 'Almost — the text is right; only the capitalization and spacing differ.';
  if (caseOnly) return 'Almost — the text is right, but the capitalization is off. Check which letters should be upper- or lowercase.';
  if (spaceOnly) return 'Almost — the words are right, but the spacing or line breaks differ from what was expected.';
  if (both) return 'Very close — only capitalization and spacing separate your output from the expected one.';
  return undefined;
}

// Source-content gate. Some items assert on the submitted code, not just its
// output — e.g. "declare a string variable and print it", which a bare
// `print("<expected>")` would otherwise satisfy. Returns false when a
// `requireCode` pattern is missing or a `forbidCode` pattern matches. An
// un-compilable pattern is skipped (the importer already rejects those, so this
// is only defensive) — fail open, never block a learner on a config bug.
function codePasses(item: SeqItem, code: string): boolean {
  const hit = (p: string): boolean | null => {
    try {
      return new RegExp(p, 'm').test(code);
    } catch {
      return null;
    }
  };
  for (const p of item.requireCode ?? []) if (hit(p) === false) return false;
  for (const p of item.forbidCode ?? []) if (hit(p) === true) return false;
  return true;
}

export function gradeConcept(item: SeqItem, choiceRaw: string): SeqGradeResult {
  const choice = choiceRaw.toUpperCase().replace(/\s/g, '');
  const correct = new Set((item.answer ?? '').split(','));
  const given = new Set(choice.split(',').filter(Boolean));
  const passed =
    given.size === correct.size && [...given].every((g) => correct.has(g)) && given.size > 0;
  return passed
    ? { passed: true, rationale: item.rationale }
    : { passed: false, ifIncorrect: item.ifIncorrect };
}

export function gradeLocalVerify(item: SeqItem, text: string): SeqGradeResult {
  const submitted = (text ?? '').trim();
  if (!submitted) return { passed: false, message: 'Paste the output from your terminal to continue.' };
  if (item.acceptPattern) {
    let re: RegExp;
    try {
      re = new RegExp(item.acceptPattern, 'm');
    } catch {
      return { passed: false, message: 'This item is misconfigured (bad accept pattern). Flag it.' };
    }
    const passed = re.test(submitted);
    return passed
      ? { passed: true, message: item.passRule }
      : { passed: false, ifIncorrect: `That doesn't match what this step expects yet. ${item.tutor ?? ''}`.trim() };
  }
  // No pattern (e.g. "confirm the file exists") — accept any non-empty confirmation.
  return { passed: true, message: item.passRule };
}

export async function gradeCode(
  item: SeqItem,
  code: string,
  language: SandboxLanguage = 'python'
): Promise<SeqGradeResult> {
  if (!code || !code.trim()) {
    return { passed: false, message: 'Write some code first.' };
  }

  let cases: ExecTestCase[];
  let mode: 'exact' | 'contains' | 'hidden';

  if (item.evaluator === 'hidden-tests') {
    mode = 'hidden';
    cases = (item.hiddenTests ?? []).map((t) => ({ input: t.stdin, expectedOutput: t.stdout }));
  } else if (item.expectOutputContains) {
    mode = 'contains';
    cases = [{ input: '', expectedOutput: item.expectOutputContains }];
  } else {
    mode = 'exact';
    cases = [{ input: '', expectedOutput: item.expectExactOutput ?? '' }];
  }
  if (cases.length === 0) return { passed: false, message: 'This item has no tests configured. Flag it.' };

  // The TypeScript course grades "strict from the beginning": the sandbox runs
  // a `tsc --noEmit --strict` gate first and reports diagnostics as a
  // compileError before any test runs.
  const resp = await executeCode(language, code, cases, {
    strictTypeCheck: language === 'typescript',
  });

  const tests: SeqTestOutcome[] = resp.results.map((r, i) => {
    const expected = cases[i].expectedOutput;
    const actual = r.actualOutput;
    let passed: boolean;
    if (mode === 'contains') passed = !resp.compileError && norm(actual).includes(norm(expected));
    else passed = r.passed;
    return {
      label: mode === 'hidden' ? `Hidden test ${i + 1}` : 'Output',
      input: cases[i].input || undefined,
      expected,
      actual,
      passed,
    };
  });

  const outputPassed = !resp.compileError && tests.length > 0 && tests.every((t) => t.passed);
  // The output can be right while the code sidesteps what the exercise teaches
  // (e.g. printing the literal instead of using a variable). Only worth checking
  // once the output already matched — a failing run has its own feedback.
  const codeGateFailed = outputPassed && !codePasses(item, code);
  const passed = outputPassed && !codeGateFailed;

  let hint: string | undefined;
  if (codeGateFailed) {
    hint =
      "Your output is correct, but this exercise also checks *how* you got it. " +
      "Re-read the instructions — they name something your code has to include. " +
      "Printing the expected text directly doesn't show you used the concept.";
  } else if (!passed) {
    // Check the first failing case for a small slip (missing quotes,
    // capitalization, whitespace) and surface a nudge instead of a bare "not yet".
    const firstFail = tests.find((t) => !t.passed);
    if (firstFail) {
      hint = nearMissHint(
        firstFail.actual,
        firstFail.expected,
        `${resp.stderr ?? ''}\n${resp.compileError ?? ''}`,
        code
      );
    }
  }

  return { passed, tests, stderr: resp.stderr, compileError: resp.compileError, hint };
}
