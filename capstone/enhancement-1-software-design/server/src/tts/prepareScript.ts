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
    // `17 % 5` -> "17 modulo 5". Whitespace is required on BOTH sides, so
    // `in/count/replace`, `src/utils`, `*args`, and `**kwargs` are left alone.
    // `//` must run before `/`. One operator per expression (the curriculum's
    // own scope) — `a / b / c` only converts the first `/`.
    .replace(/([\w)\]'"])\s+\/\/\s+([\w([+-])/g, '$1 floor divided by $2')
    .replace(/([\w)\]'"])\s+\/\s+([\w([+-])/g, '$1 divided by $2')
    .replace(/([\w)\]'"])\s+%\s+([\w([+-])/g, '$1 modulo $2');

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
      const inlined = applyLiteral(fixCodeText(c), lex.codeSymbols);
      const t = c.trim();
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
