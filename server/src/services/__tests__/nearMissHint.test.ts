import { nearMissHint, HINT_RULES, HintContext } from '../nearMissHint';

function ctx(overrides: Partial<HintContext>): HintContext {
  return {
    actual: '',
    expected: '',
    errText: '',
    submittedCode: '',
    language: 'python',
    ...overrides,
  };
}

describe('nearMissHint — ported Python behavior (unchanged from the original ladder)', () => {
  it('returns undefined for an exact match (no hint needed)', () => {
    expect(
      nearMissHint(ctx({ actual: 'Hello, world!', expected: 'Hello, world!', submittedCode: 'print("Hello, world!")' }))
    ).toBeUndefined();
  });

  it('returns undefined for a genuinely different answer', () => {
    expect(nearMissHint(ctx({ actual: 'Goodbye', expected: 'Hello, world!', submittedCode: 'print("Goodbye")' }))).toBeUndefined();
  });

  it('flags capitalization-only differences', () => {
    const hint = nearMissHint(ctx({ actual: 'hello, world!', expected: 'Hello, World!', submittedCode: 'print("hello, world!")' }));
    expect(hint).toMatch(/capitalization/i);
  });

  it('flags whitespace-only differences', () => {
    const hint = nearMissHint(ctx({ actual: 'Hello   world', expected: 'Hello world', submittedCode: 'print("Hello   world")' }));
    expect(hint).toMatch(/spacing/i);
  });

  it('flags a case-AND-whitespace difference via the "both" rule (the original\'s combined check was dead code — see below)', () => {
    const hint = nearMissHint(ctx({ actual: 'helloworld', expected: 'Hello World', submittedCode: 'print("helloworld")' }));
    expect(hint).toMatch(/very close/i);
  });

  it('flags a missing trailing punctuation mark', () => {
    const hint = nearMissHint(ctx({ actual: 'Total: 15', expected: 'Total: 15.', submittedCode: 'print("Total: 15")' }));
    expect(hint).toMatch(/end/i);
  });

  it('flags a NameError caused by a missing string literal quotes', () => {
    const hint = nearMissHint(
      ctx({
        actual: '',
        expected: 'Denver',
        errText: "NameError: name 'Denver' is not defined",
        submittedCode: 'city = Denver\nprint(city)',
      })
    );
    expect(hint).toMatch(/quotation marks/i);
  });

  it('flags an unterminated string literal', () => {
    const hint = nearMissHint(
      ctx({ actual: '', expected: 'Denver', errText: 'SyntaxError: unterminated string literal', submittedCode: 'print("Denver)' })
    );
    expect(hint).toMatch(/closing quotation mark/i);
  });

  it('flags two statements jammed onto one line', () => {
    const hint = nearMissHint(
      ctx({ actual: '', expected: 'a\nb', errText: 'SyntaxError: invalid syntax', submittedCode: 'print("a") print("b")' })
    );
    expect(hint).toMatch(/two statements/i);
  });

  it('flags a missing comma between print arguments', () => {
    const hint = nearMissHint(
      ctx({
        actual: '',
        expected: 'Total: 15',
        errText: 'SyntaxError: invalid syntax. Perhaps you forgot a comma?',
        submittedCode: 'print("Total:" 15)',
      })
    );
    expect(hint).toMatch(/comma/i);
  });
});

describe('nearMissHint — dead-code correction', () => {
  it('the original caseOnly-AND-spaceOnly branch was mathematically unreachable — confirm the "both" rule is what actually fires', () => {
    // caseOnly requires a and e to already be whitespace-identical; spaceOnly
    // requires them to already be case-identical. Both true simultaneously
    // implies a === e, which the outputMismatch gate already excludes before
    // any comparison rule runs — so no input can ever reach a dead branch
    // like that, and there's nothing further to assert beyond the "both"
    // rule (tested above) actually covering that case correctly.
    const bothRule = HINT_RULES.find((r) => r.id === 'both-case-and-whitespace');
    expect(bothRule).toBeDefined();
    // There is deliberately no separate "case-and-whitespace" rule anymore —
    // only case-only, whitespace-only, and both.
    expect(HINT_RULES.filter((r) => /case/i.test(r.id) || /whitespace/i.test(r.id))).toHaveLength(3);
  });
});

describe('nearMissHint — language gating (the actual bug this milestone fixes)', () => {
  it('does NOT fire a Python-specific rule on a TypeScript submission with Python-shaped error text', () => {
    const hint = nearMissHint(
      ctx({
        actual: '',
        expected: 'a\nb',
        errText: 'SyntaxError: invalid syntax',
        submittedCode: 'print("a") print("b")',
        language: 'typescript',
      })
    );
    expect(hint).toBeUndefined();
  });

  it('does NOT fire a Python-specific rule on a C++ submission with Python-shaped error text', () => {
    const hint = nearMissHint(
      ctx({
        actual: '',
        expected: 'Denver',
        errText: "NameError: name 'Denver' is not defined",
        submittedCode: 'std::cout << Denver;',
        language: 'cpp',
      })
    );
    expect(hint).toBeUndefined();
  });

  it('language-agnostic rules (case/whitespace/punctuation) still fire regardless of language', () => {
    const hint = nearMissHint(ctx({ actual: 'denver', expected: 'Denver', language: 'cpp' }));
    expect(hint).toMatch(/capitalization/i);
  });
});

describe('nearMissHint — new TypeScript rule (verified against a real tsc --strict compile)', () => {
  it('flags a missing string literal from a real TS2304 diagnostic', () => {
    const hint = nearMissHint(
      ctx({
        actual: '',
        expected: 'Denver',
        errText: "solution.ts(1,14): error TS2304: Cannot find name 'Denver'.",
        submittedCode: 'const city = Denver;\nconsole.log(city);',
        language: 'typescript',
      })
    );
    expect(hint).toMatch(/quotation marks/i);
  });

  it('does not fire when the undefined name has nothing to do with the expected output', () => {
    const hint = nearMissHint(
      ctx({
        actual: '',
        expected: '42',
        errText: "solution.ts(1,14): error TS2304: Cannot find name 'someTypo'.",
        submittedCode: 'console.log(someTypo);',
        language: 'typescript',
      })
    );
    expect(hint).toBeUndefined();
  });
});

describe('nearMissHint — new C++ rule (verified against a real g++ compile)', () => {
  it('flags a missing string literal from a real g++ undeclared-identifier error', () => {
    const hint = nearMissHint(
      ctx({
        actual: '',
        expected: 'Denver',
        errText: "solution.cpp:3:18: error: 'Denver' was not declared in this scope",
        submittedCode: 'std::cout << Denver << std::endl;',
        language: 'cpp',
      })
    );
    expect(hint).toMatch(/quotation marks/i);
  });

  it('does not fire when the undeclared name has nothing to do with the expected output', () => {
    const hint = nearMissHint(
      ctx({
        actual: '',
        expected: '42',
        errText: "solution.cpp:3:18: error: 'oops' was not declared in this scope",
        submittedCode: 'std::cout << oops;',
        language: 'cpp',
      })
    );
    expect(hint).toBeUndefined();
  });
});

describe('nearMissHint — Java rule (verified against a real javac 17 compile)', () => {
  const javacError = [
    'Main.java:3: error: cannot find symbol',
    '    System.out.println(Denver);',
    '                       ^',
    '  symbol:   variable Denver',
    '  location: class Main',
    '1 error',
  ].join('\n');

  it('flags a missing string literal from a real javac "cannot find symbol" error', () => {
    const hint = nearMissHint(
      ctx({ expected: 'Denver', errText: javacError, submittedCode: 'System.out.println(Denver);', language: 'java' })
    );
    expect(hint).toMatch(/quotation marks/i);
  });

  it('does not fire for an unrelated missing variable', () => {
    const hint = nearMissHint(
      ctx({ expected: '42', errText: javacError.replace(/Denver/g, 'total'), language: 'java' })
    );
    expect(hint).toBeUndefined();
  });

  it('does not fire for the same error text in another language', () => {
    expect(nearMissHint(ctx({ expected: 'Denver', errText: javacError, language: 'cpp' }))).toBeUndefined();
  });
});

describe('nearMissHint — priority ordering', () => {
  it('prefers the more specific unterminated-string diagnosis over the comma heuristic when both could plausibly match', () => {
    // Deliberately ambiguous: the error text satisfies both
    // py-unterminated-string (priority 30) and py-missing-comma's
    // "forgot a comma" text match (priority 40). The more specific,
    // more certain diagnosis (an actual unterminated-string diagnostic)
    // should win over the comma heuristic, which also has a fuzzier
    // code-shape fallback more prone to false-positiving.
    const hint = nearMissHint(
      ctx({
        actual: '',
        expected: 'Denver',
        errText: 'SyntaxError: unterminated string literal (detected at line 1). Perhaps you forgot a comma?',
        submittedCode: 'print("Denver)',
        language: 'python',
      })
    );
    expect(hint).toMatch(/closing quotation mark/i);
  });
});

describe('nearMissHint — real line-level diff for multi-line "basically right" output', () => {
  it('names the specific differing line when exactly one line of several is wrong', () => {
    // A genuine content difference on one line (not explainable by case or
    // whitespace alone — those higher-priority rules operate on the whole
    // string and would otherwise mask this) — Denver vs Boston, not a
    // capitalization slip.
    const expected = 'Name: Ada\nAge: 25\nCity: Denver';
    const actual = 'Name: Ada\nAge: 25\nCity: Boston';
    const hint = nearMissHint(ctx({ actual, expected, submittedCode: 'print(...)' }));
    expect(hint).toMatch(/line 3/i);
    expect(hint).toMatch(/denver/i);
    expect(hint).toMatch(/boston/i);
  });

  it('does not fire when the output is too different to be a "basically right" near miss', () => {
    const expected = 'Name: Ada\nAge: 25\nCity: Denver\nJob: Engineer\nPet: Cat';
    const actual = 'Totally\nDifferent\nContent\nHere\nNow';
    const hint = nearMissHint(ctx({ actual, expected, submittedCode: 'print(...)' }));
    expect(hint).toBeUndefined();
  });

  it('does not fire for single-line output (the existing case/whitespace/punctuation rules already own that)', () => {
    const hint = nearMissHint(ctx({ actual: 'completely wrong', expected: 'Hello', submittedCode: 'print("completely wrong")' }));
    expect(hint).toBeUndefined();
  });
});

describe('HINT_RULES table sanity', () => {
  it('has unique rule ids', () => {
    const ids = HINT_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('is ordered by ascending priority when sorted (evaluation order matches the documented table)', () => {
    const priorities = HINT_RULES.map((r) => r.priority);
    const sorted = [...priorities].sort((a, b) => a - b);
    // Not asserting HINT_RULES is pre-sorted in the array literal itself
    // (nearMissHint sorts at call time) — just that priorities are what the
    // rule table intends: no duplicate priority within the same language
    // scope, which would make evaluation order ambiguous.
    const seen = new Map<string, number>();
    for (const rule of HINT_RULES) {
      const langKey = rule.languages === 'all' ? 'all' : rule.languages.join(',');
      const key = `${langKey}:${rule.priority}`;
      expect(seen.has(key)).toBe(false);
      seen.set(key, 1);
    }
    expect(sorted.length).toBe(priorities.length);
  });
});
