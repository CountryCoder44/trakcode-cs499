import { SeqItem } from '../models/SeqTopic';
import { executeCode, ExecTestCase, SandboxLanguage } from './executionClient';
import { nearMissHint } from './nearMissHint';

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
      hint = nearMissHint({
        actual: firstFail.actual,
        expected: firstFail.expected,
        errText: `${resp.stderr ?? ''}\n${resp.compileError ?? ''}`,
        submittedCode: code,
        language,
      });
    } else if (resp.compileError) {
      // A TypeScript/C++ compile-time failure never produces a test result at
      // all (every runner returns results:[] alongside compileError), so
      // `tests` is empty and firstFail above is never found — meaning this
      // branch was previously unreachable for a compile error, and the
      // language-specific "missing quotes" rules (which fire on exactly this
      // kind of diagnostic) would never actually run in production despite
      // passing in isolation. Still worth checking the diagnostic text
      // itself against the target output.
      hint = nearMissHint({
        actual: '',
        expected: cases[0]?.expectedOutput ?? '',
        errText: resp.compileError,
        submittedCode: code,
        language,
      });
    }
  }

  return { passed, tests, stderr: resp.stderr, compileError: resp.compileError, hint };
}
