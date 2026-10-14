import { promises as fs } from 'fs';
import path from 'path';

// Turns a lesson's markdown reading/instruction text into a plain-text "spoken
// script" for ElevenLabs, applying the pronunciation rules in
// `Sequential Curriculum/tts-lexicon.json`. Also returns the text split into
// sentences (display form + spoken form) so the player can highlight the
// sentence currently being read. See `Sequential Curriculum/AUDIO.md`.

/** One run of a sentence's DISPLAY text — either plain prose or the verbatim
 *  content of one `inline code` span. Lets the read-along panel highlight
 *  exactly the spans the author marked as code, instead of guessing from
 *  whole-word text matching against the lesson's code tokens. Optional on
 *  `PreparedSentence` only in the sense that older, already-generated clips'
 *  `.json` timings predate this field — the client falls back to its old
 *  heuristic when it's absent. */
export interface DisplaySegment {
  text: string;
  code: boolean;
}
export interface PreparedSentence {
  /** What the learner sees in the read-along panel (markdown inline stripped). */
  display: string;
  /** What is sent to TTS for this sentence (pronunciation-expanded). */
  spoken: string;
  /** `display`, broken into plain/code runs in order. */
  segments: DisplaySegment[];
}
export interface PreparedScript {
  /** Full spoken script — one sentence per line. */
  script: string;
  sentences: PreparedSentence[];
}

interface RegexRule {
  pattern: string;
  replace: string;
  flags?: string;
  /**
   * When true, this rule shapes the SPOKEN form only — the read-along panel
   * keeps the text as written. Use for pure pronunciation expansions
   * ("2.3" -> "2 point 3", "ValueError" -> "Value Error", "__init__" ->
   * "dunder init", "my_var" -> "my var"). Rules without it (markdown bold
   * strip, fenced-block drop) also apply to the displayed text.
   */
  spokenOnly?: boolean;
}
interface Lexicon {
  regexRules: RegexRule[];
  codeSymbols: [string, string][];
  proseSymbols: [string, string][];
  words: Record<string, string>;
}

let cached: Lexicon | null = null;

export async function loadLexicon(): Promise<Lexicon> {
  if (cached) return cached;
  const p = path.resolve(__dirname, '..', '..', '..', 'Sequential Curriculum', 'tts-lexicon.json');
  const raw = JSON.parse(await fs.readFile(p, 'utf8'));
  cached = {
    regexRules: raw.regexRules ?? [],
    codeSymbols: raw.codeSymbols ?? [],
    proseSymbols: raw.proseSymbols ?? [],
    words: raw.words ?? {},
  };
  return cached;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// A quoted single character (` "p" `/`'y'`) is a common indexing/slicing-lesson
// answer ("what does word[0] return?"). Read in isolation, a bare letter is
// ambiguous between its NAME and a phonetic guess at the sound it makes —
// ElevenLabs picks the phonetic guess (found live on py-4.2-01's "p"/"y").
// Mapped directly here, before the normal quote-silencing/codeSymbols path
// ever sees it: that path's own "smooth" check (below) tests the RAW code
// content including the quote marks, so a quoted letter never matches
// `/^[A-Za-z_]..$/` and always gets comma-wrapped instead of read as a word —
// a lexicon regexRule can't fix this, since it only ever sees that unstable,
// already-comma-wrapped intermediate text, never a clean "p.".
// `a`/`e` are respelled again, live-verified needing it (2026-09-16): "Ay"
// came back sounding like "eye" (letter I). Tried "Aye" (the dictionary word)
// next — still "eye", almost certainly because "aye" is a homograph and its
// far more common everyday reading is the nautical/informal "yes" (/aɪ/, as
// in "aye aye, captain"), not the rarer letter-name/parliamentary-vote
// reading (/eɪ/) — ElevenLabs picks the common one either way. Landed on the
// bare single letter "A" instead: unlike the ORIGINAL bug (a quoted "a"
// wrapped in comma pauses by the smooth/comma-wrap check below), a solitary
// capital letter reaches ElevenLabs as a clean, isolated one-word sentence,
// same fix shape that already worked for "e" -> single "E". "Ee" (doubled
// letter) was read as two syllables, "e-e" — a single "E" avoids the visual
// duplication.
const LETTER_NAMES: Record<string, string> = {
  a: 'A', b: 'Bee', c: 'See', d: 'Dee', e: 'E', f: 'Eff', g: 'Gee', h: 'Aitch',
  i: 'Eye', j: 'Jay', k: 'Kay', l: 'Ell', m: 'Em', n: 'En', o: 'Oh', p: 'Pee',
  q: 'Cue', r: 'Are', s: 'Ess', t: 'Tee', u: 'You', v: 'Vee', w: 'Double-u',
  x: 'Ex', y: 'Why', z: 'Zee',
};

// A quoted multi-character run that isn't a real word — the string-slicing
// lessons (4.3/4.4) demonstrate exactly which characters a slice extracted,
// e.g. `"abcdef"[::2]` -> `"ace"`, or `"1234567"[::2]` -> `"234567"`. Read as
// one continuous token, ElevenLabs either guesses at a made-up "word"
// (abcdef) or reads a multi-digit run as one large number (234567 -> "two
// hundred thirty-four thousand five hundred sixty-seven") — neither
// communicates "these are the individual extracted characters." Fixed the
// same shape as LETTER_NAMES: split into period-separated single characters,
// spoken form only (the read-along keeps the normal "abcdef"/"234567" text).
// **Deliberately a curated allowlist, not a blanket "any quoted multi-char
// run" rule** — the vast majority of quoted strings in this curriculum ARE
// real words/names meant to be read as words (`"python"`, `"Denver"`,
// `"cat"` ...), including, critically, Topic 2's `"42"`/`"10"`/`"12"` (a
// string that deliberately LOOKS like a number, since that lesson's whole
// point is "the string '42' looks like the number 42, just stored as text" —
// splitting it into "four two" would be a real regression on locked
// content). Checked every entry here for uniqueness across the whole
// curriculum before adding (2026-09-17) — each string below occurs only in
// the Lesson 4.4 item it was added for.
const SPELL_OUT_RUNS = new Set([
  // Lesson 4.3/4.4 letter-slicing sources/results (not real words)
  'abcdef', 'ace', 'abcdefgh', 'aceg', 'abcdefghij', 'cfi', 'beh', 'cfij',
  'defghi', 'edoc', 'dae', 'rwe',
  // py-4.8-04's search substring — "an" as a bare word ("First an: 1") or as
  // plain English ("word.find(\"an\")" attempted as the article) was reading
  // unclear/smooshed no matter how it was phrased (tried the bare word, then
  // a spliced-audio version — the splice had its own problem, an audible
  // tone jump between two independently-recorded library takes). Spelling it
  // out as one continuous synthesis call avoids both failure modes.
  'an',
  // Lesson 4.3/4.4 digit-slicing sources/results
  '1234567', '234567', '246', '1357', '7654321', '0123456789',
]);

// Placeholder for the pause between spelled-out characters — an alphabetic
// token (not real punctuation), so it survives codeSymbols untouched. A
// literal "." inserted before codeSymbols runs would itself get renamed to
// the WORD "dot" by codeSymbols' own `.` -> "dot" entry (the same rule that
// turns `text.strip()` into "text dot strip") — swapped back to a real "."
// only in the `spokenBody` callback below, once codeSymbols has already run.
const SPELL_SEP = 'AAspellsepAA';
// Same problem, different character: LETTER_NAMES['w'] is "Double-u" — its
// own hyphen ALSO isn't safe to send into codeSymbols unprotected, since
// codeSymbols has a `-` -> " minus " entry (for a real minus sign in code).
// The ORIGINAL single-quoted-letter path never hits this because it returns
// before codeSymbols ever runs; spellOutRun's output goes on to fixCodeText/
// codeSymbols like any other code-span text, so it needs the same sentinel
// protection. Found live on "rwe" (py-4.4-05.opt-C): "Double-u" came out as
// "Double minus u" — confirmed by checking the actual prepared script text,
// not just by ear.
const SPELL_HYPHEN = 'AAspellhyphenAA';

function spellOutRun(run: string): string {
  // No trailing separator after the LAST character — the surrounding text
  // (endStop's appended period on an option, or the sentence's own trailing
  // punctuation in a read/do field) already supplies one; adding our own
  // too produced a double "..".
  const spelled = run
    .split('')
    .map((ch) => {
      if (!/[a-z]/i.test(ch)) return ch;
      return LETTER_NAMES[ch.toLowerCase()].replace(/-/g, SPELL_HYPHEN);
    })
    .join(`${SPELL_SEP} `);
  return ` ${spelled} `;
}

// Typographic punctuation -> plain ASCII the TTS engine reads sanely. Applied to
// the SPOKEN form only — the read-along panel keeps the real punctuation. An em
// dash was being spoken (SAPI says "a euro" for a mis-decoded "—"); a dash in
// prose is meant to be a brief pause, so it becomes a comma.
function normalizeTypography(s: string): string {
  return s
    .replace(/[‘’‚‛]/g, "'") // ‘ ’ ‚ ‛ -> '
    .replace(/[“”„‟]/g, '"') // “ ” „ ‟ -> "
    .replace(/ /g, ' ') // no-break space -> space
    .replace(/\s*[—―]\s*/g, ', ') // — ― -> brief pause
    .replace(/\s+–\s+/g, ', ') // spaced – -> brief pause
    .replace(/–/g, '-') // – (e.g. a number range) -> hyphen
    .replace(/…/g, ', ') // … -> brief pause
    .replace(/\s*\.\.\.+\s*/g, ', ') // literal "..." in prose -> brief pause
    .replace(/→/g, '->') // → -> handled by the -> symbol rule
    // A hyphen joining two words in prose ("f-string", "multiplication-level")
    // isn't a minus sign, but SAPI reads it as one ("f minus string"). Any real
    // minus operator has already gone through codeSymbols inside its `code
    // span` by this point, so a letter-hyphen-letter surviving out here is
    // always a compound word -- drop the hyphen to a plain space.
    .replace(/([A-Za-z])-([A-Za-z])/g, '$1 $2');
}

// Drops a parenthetical that just repeats the phrase right before it — e.g.
// "less than (less than)" or "string (\"string\")". This happens generically
// whenever a `code span`'s own pronunciation (via codeSymbols/words, below)
// already IS a name the author also spelled out in parentheses for a sighted
// reader (`` `<` (less than) ``, `` `str` ("string") ``) — the audio would
// otherwise say the same word twice back to back. Runs on the fully-assembled
// spoken text, so it doesn't care whether the repeated phrase came from a code
// span or from plain prose; it only cares that the same words appear twice in
// a row. The read-along keeps the parenthetical (display is untouched).
function collapseRepeatedParenthetical(s: string): string {
  return s.replace(/\b([a-z]+(?:\s+[a-z]+){0,5})\b\s*,?\s*\(\s*["']?\1["']?\s*\)/gi, '$1');
}

function applyLiteral(text: string, pairs: [string, string][]): string {
  if (pairs.length === 0) return text;
  // Single left-to-right pass via one alternation (longest literal first, so
  // "==" beats "=" and ">>>" beats ">"). Crucially this does NOT re-scan
  // replacement text, so ">>>" -> "triple greater-than" is not then chewed by
  // the "-" rule.
  const sorted = [...pairs].sort((a, b) => b[0].length - a[0].length);
  const map = new Map(sorted.map(([f, t]) => [f, t]));
  const re = new RegExp(sorted.map(([f]) => escapeRe(f)).join('|'), 'g');
  return text.replace(re, (m) => map.get(m) ?? m);
}

function applyWords(text: string, words: Record<string, string>): string {
  let out = text;
  for (const [from, to] of Object.entries(words)) {
    out = out.replace(new RegExp(`\\b${escapeRe(from)}\\b`, 'g'), to);
  }
  return out;
}

// Whitespace/punctuation tidy-up shared by `collapse()` (whole sentence) and
// `buildDisplaySegments()` (one plain-text run at a time) — e.g. a code span
// followed by ", " followed by another code span must not leave a stray
// space before the comma ("class , for" -> "class, for").
function tidySpacing(s: string): string {
  return s
    .replace(/\s+/g, ' ')
    .replace(/(?:\s*,\s*){2,}/g, ', ') // "x , , , y" -> "x, y"
    .replace(/\s*,\s*([.!?;:])/g, '$1') // ", ." -> "."
    .replace(/([([{])\s*,\s*/g, '$1') // "( ," -> "("
    .replace(/\s*,\s*([)\]}])/g, '$1') // ", )" -> ")"
    .replace(/\s+([.,;:!?])/g, '$1');
}

function collapse(s: string): string {
  return tidySpacing(s).replace(/^[\s,]+/, '').trim();
}

const DOT = 'AAdotAA'; // sentinel: a '.' that must not end a sentence

function splitSentences(text: string): string[] {
  const guarded = text
    .replace(/(\d)\.(\d)/g, `$1${DOT}$2`)
    .replace(/\b(e\.g|i\.e|etc|vs|Dr|Mr|Ms|Mrs|No)\./g, `$1${DOT}`);
  const parts = guarded
    .split(/(?<=[.!?])[ \t]+(?=[A-Z"'`([{])/)
    .map((s) => s.split(DOT).join('.').trim())
    .filter(Boolean);
  return parts.length ? parts : [text.trim()].filter(Boolean);
}

const codeMask = (i: number) => `AAc${i}AA`;
const CODE_MASK_RE = /AAc(\d+)AA/g;

// Splits a masked sentence into ordered plain/code runs for the read-along's
// exact-position highlighting. Mirrors the plain `unmask((c) => c)` path used
// to build `display` (same raw code-span text, no pronunciation expansion) —
// just kept as separate pieces instead of flattened into one string.
function buildDisplaySegments(mSent: string, codeSpans: string[]): DisplaySegment[] {
  const segments: DisplaySegment[] = [];
  const re = /AAc(\d+)AA/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(mSent))) {
    const plain = tidySpacing(mSent.slice(last, m.index));
    if (plain !== '') segments.push({ text: plain, code: false });
    segments.push({ text: codeSpans[Number(m[1])].trim(), code: true });
    last = re.lastIndex;
  }
  const tail = tidySpacing(mSent.slice(last));
  if (tail !== '') segments.push({ text: tail, code: false });

  // Trim only the outer edges — a lone " " between two code segments is a
  // meaningful separator and must survive.
  if (segments.length) {
    const first = segments[0];
    if (!first.code) first.text = first.text.replace(/^[\s,]+/, '');
    const end = segments[segments.length - 1];
    if (!end.code) end.text = end.text.replace(/\s+$/, '');
  }
  return segments.filter((s) => s.code || s.text !== '');
}

const applyRegexRules = (text: string, rules: RegexRule[]): string =>
  rules.reduce((t, r) => t.replace(new RegExp(r.pattern, r.flags ?? 'g'), r.replace), text);

// Mirror the prose regexRules that are safe on a code span (NOT bold-strip —
// `2 ** 3 ** 2` would be mangled). Runs before codeSymbols.
const fixCodeText = (c: string) =>
  c
    // Spell out a known non-word letter/digit run (SPELL_OUT_RUNS above), OR
    // a single quoted letter EMBEDDED in a larger expression (e.g. `word[0]
    // = "b"` — the whole-span early return above only fires when a code
    // span's ENTIRE content is just `"b"`; here the quoted letter is part of
    // a bigger span, so without this it falls through to plain codeSymbols
    // quote-silencing and leaves a bare, ambiguous "b" mid-expression — the
    // exact failure LETTER_NAMES exists to prevent, just not caught until
    // Lesson 4.5's very first item, `word[0] = "b"` / `"B" + word[1:]` /
    // etc. — checked the whole curriculum first: this shape occurs nowhere
    // in Topics 1–3 or Lessons 4.1–4.4, only here and in not-yet-narrated
    // 4.7/4.8, so nothing locked is at risk). A lone letter is unambiguous
    // in ANY context, unlike a multi-character run (SPELL_OUT_RUNS' own
    // curated-allowlist reasoning), so this part IS a blanket rule.
    // Must run first, before quote-silencing (codeSymbols, below) removes the
    // quote marks this match depends on, and before the `(\d)\.(\d)` "point"
    // rule below, which would otherwise treat the periods this inserts as
    // decimal points (it can't: every period here is followed by a space, and
    // that rule requires digit-period-digit with no space between).
    // Substring match, not whole-span-only, so it also catches a run
    // embedded in a larger expression like `"1234567"[::2]`.
    .replace(/(["'])([A-Za-z0-9]+)\1/g, (m: string, _q: string, run: string) => {
      if (run.length === 1 && /[a-zA-Z]/.test(run)) {
        return ` ${LETTER_NAMES[run.toLowerCase()].replace(/-/g, SPELL_HYPHEN)} `;
      }
      return SPELL_OUT_RUNS.has(run.toLowerCase()) ? spellOutRun(run) : m;
    })
    // `...` inside code is an "elided arguments / contents" placeholder — drop it
    // so `print(...)` reads "print open paren close paren", `{...}` reads "open
    // brace close brace", `<class '...'>` loses the "dot dot dot". Must run
    // before codeSymbols turns `.` into "dot".
    .replace(/\.\.\.+/g, '')
    .replace(/(\d)\.(\d)/g, '$1 point $2') // 3.5 -> three point five
    .replace(/\b__([a-z]+)__\b/g, 'dunder $1') // __init__ -> dunder init
    .replace(/\b([A-Z][a-zA-Z]*)(Error|Warning|Exception)\b/g, '$1 $2') // ValueError -> Value Error
    .replace(/([a-zA-Z])_([a-zA-Z])/g, '$1 $2') // my_var -> my var
    // An arithmetic operator with an operand on each side reads as its name:
    // `8 / 4` -> "8 divided by 4", `17 // 5` -> "17 floor divided by 5",
    // `17 % 5` -> "17 modulo 5", `3 ** 2` -> "3 to the power of 2". Whitespace
    // is required on BOTH sides, so `in/count/replace`, `src/utils`, `*args`,
    // and `**kwargs` are left alone. `//` must run before `/`; `**` must run
    // before either (it contains `/`-free but shares no chars with them, so
    // order among these three doesn't matter, only that it precedes any bare
    // `*`/`**` codeSymbols fallback below). One operator per expression (the
    // curriculum's own scope) — `a / b / c` only converts the first `/`. A
    // BARE `**`/`*` with no operand on one side (introducing the symbol
    // itself, e.g. "`**` raises a number to a power") is deliberately left
    // for codeSymbols below to say "double star"/"times" — only an operand
    // pair gets the operator-name phrasing.
    .replace(/([\w)\]'"])\s+\*\*\s+([\w([+-])/g, '$1 to the power of $2')
    .replace(/([\w)\]'"])\s+\/\/\s+([\w([+-])/g, '$1 floor divided by $2')
    .replace(/([\w)\]'"])\s+\/\s+([\w([+-])/g, '$1 divided by $2')
    .replace(/([\w)\]'"])\s+%\s+([\w([+-])/g, '$1 modulo $2')
    // `4 == 4` -> "4 compared to 4" — same reasoning as the arithmetic
    // operators above. `==`'s bare codeSymbols name ("double equals") reads
    // fine ONCE, introducing the symbol, but sounds redundant repeated across
    // every operand pair in the same item (py-3.3-01: "4 double equals 4...
    // 4 double equals 7..."). `!=`/`<=`/`>=` are left alone — their bare
    // names ("not equal to", "less than or equal to", "greater than or equal
    // to") already read naturally as infix phrases with no "double X"-style
    // repetition problem, so there's nothing to fix there unless reported.
    // Right-hand class includes `'`/`"` (unlike the arithmetic operators
    // above) because `==` routinely compares string literals, e.g.
    // `"Python" == "python"` — the arithmetic operators don't take string
    // operands in this curriculum's scope, so theirs is left narrower.
    .replace(/([\w)\]'"])\s+==\s+([\w(['"+-])/g, '$1 compared to $2');

export async function prepareTtsScript(markdown: string): Promise<PreparedScript> {
  const lex = await loadLexicon();

  // 1. drop fenced code blocks (defensive — read/do/brief normally have none).
  let block = markdown.replace(/```[\s\S]*?```/g, ' ');

  // 2. mask `inline code` BEFORE any other rule, so `**` (exponent), `_`, `.`
  //    etc. inside code are never mistaken for markdown bold / punctuation.
  const codeSpans: string[] = [];
  block = block.replace(/`([^`]+)`/g, (_m, c: string) => {
    codeSpans.push(c);
    return ` ${codeMask(codeSpans.length - 1)} `;
  });

  // 3. lexicon regex rules that also shape the DISPLAYED text (strip markdown
  //    bold, drop fenced blocks). Pronunciation-only rules ("2.3" -> "2 point
  //    3", "ValueError" -> "Value Error", dunder, snake_case) are tagged
  //    `spokenOnly` and applied further down to the spoken form alone, so the
  //    read-along panel still reads "2.3", "ValueError", "__init__", "my_var".
  const spokenOnlyRules = lex.regexRules.filter((r) => r.spokenOnly);
  for (const r of lex.regexRules) {
    if (r.spokenOnly) continue;
    block = block.replace(new RegExp(r.pattern, r.flags ?? 'g'), r.replace);
  }

  // 4. split, then per sentence build the display and spoken forms.
  const sentences: PreparedSentence[] = splitSentences(block).map((mSent) => {
    const unmask = (fn: (code: string) => string) =>
      mSent.replace(CODE_MASK_RE, (_m, i: string) => fn(codeSpans[Number(i)]));

    const display = collapse(unmask((c) => c));
    const segments = buildDisplaySegments(mSent, codeSpans);
    const spokenBody = unmask((c) => {
      const t = c.trim();
      const letterMatch = /^["']([a-zA-Z])["']$/.exec(t);
      const letterName = letterMatch ? LETTER_NAMES[letterMatch[1].toLowerCase()] : undefined;
      if (letterName) return ` ${letterName} `;
      // Restore both spell-out sentinels now that codeSymbols (which would
      // otherwise rename a literal "." to the word "dot", and a literal "-"
      // to " minus ") has already run.
      const inlined = applyLiteral(fixCodeText(c), lex.codeSymbols)
        .split(SPELL_SEP).join('.')
        .split(SPELL_HYPHEN).join('-');
      // short identifiers ("a", "n", "sum") and plain numbers ("2", "-1") read
      // fine mid-sentence — don't chop the flow with comma pauses.
      const smooth = /^-?\d+$/.test(t) || /^[A-Za-z_][A-Za-z0-9_]{0,2}$/.test(t);
      return smooth ? ` ${inlined} ` : `, ${inlined}, `;
    });
    const spoken = collapse(
      collapseRepeatedParenthetical(
        applyWords(
          applyLiteral(
            applyRegexRules(normalizeTypography(spokenBody), spokenOnlyRules),
            lex.proseSymbols
          ),
          lex.words
        )
      )
    );
    return { display, spoken, segments };
  });

  return {
    script: sentences.map((s) => s.spoken).join('\n'),
    sentences,
  };
}
