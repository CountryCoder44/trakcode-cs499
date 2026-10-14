import type { ReactNode } from 'react';
import type { SeqDisplaySegment } from '../api/types';

// The read-along panel highlights code spans in a narrated sentence. When the
// timings carry `segments` (exact plain/code runs from the server's own
// sentence-splitting — see prepareScript.ts's buildDisplaySegments), render
// straight from those: no guessing. Older clips generated before `segments`
// existed carry only flat sentence text, so they fall back to re-applying
// `code` styling by matching the code tokens pulled from the lesson's source
// markdown — a best-effort re-highlight, since flat text has no markup left.

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isIdentifier = (t: string) => /^[A-Za-z_]\w*$/.test(t);

// Python keywords/operators that are also ordinary English words. As bare
// lowercase tokens they can't be told apart from prose ("`in`" vs. "in the
// list"), so they're left unstyled in the read-along rather than lighting up
// every occurrence. Longer/none-word tokens (`print`, `first_name`, `int()`)
// are unaffected.
const AMBIGUOUS_WORDS = new Set(['in', 'is', 'or', 'as', 'and', 'not', 'to', 'from']);

/** Split a sentence into `<code>` spans and plain spans for the read-along.
 *  Prefers exact `segments` (from the clip's timings JSON) when present —
 *  these mark precisely what the author wrote in backticks, so `for`/`if`/`in`
 *  highlight correctly even though they're also ordinary English words.
 *  Falls back to whole-word matching against `tokens` (pulled from the
 *  lesson's raw markdown) for clips generated before `segments` existed;
 *  identifier tokens match whole words only, so "if"/"print"/"age" don't
 *  light up inside "different"/"prints"/"language" — but bare lowercase
 *  keyword/English-word overlaps (`AMBIGUOUS_WORDS`) can't be told apart from
 *  prose in flat text, so the fallback leaves them unstyled. */
export function renderReadAlong(text: string, tokens: string[], segments?: SeqDisplaySegment[]): ReactNode {
  if (segments && segments.length > 0) {
    return segments.map((seg, i) => (seg.code ? <code key={i}>{seg.text}</code> : <span key={i}>{seg.text}</span>));
  }

  const usable = tokens.filter((t) => !(isIdentifier(t) && t === t.toLowerCase() && AMBIGUOUS_WORDS.has(t)));
  if (usable.length === 0) return text;

  // longest first so "int()" wins over "int"
  const ordered = [...usable].sort((a, b) => b.length - a.length);
  const alt = ordered.map((t) => (isIdentifier(t) ? `\\b${escapeRe(t)}\\b` : escapeRe(t))).join('|');
  const pattern = new RegExp(`(${alt})`, 'g');
  const tokenSet = new Set(ordered);

  return text
    .split(pattern)
    .filter((p) => p !== '')
    .map((part, i) => (tokenSet.has(part) ? <code key={i}>{part}</code> : <span key={i}>{part}</span>));
}
