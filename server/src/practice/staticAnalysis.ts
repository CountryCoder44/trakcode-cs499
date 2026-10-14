import { Detector, PracticeLanguage, catalogFor } from './catalog';

// Heuristic code checks for Practice Mode. Code is scanned with string
// literals and comments blanked out, so a word inside a message or a comment
// ("for each item", "# open the file") never counts as using a construct.
// Import/include lines are kept intact so module names (mock_api, csv) are
// still visible. These checks are honest approximations, not proof: they back
// generation validation and the "concept evidence" items on a learner's
// checklist, which are labelled as code checks.

function blankStringsAndComments(code: string, language: PracticeLanguage): string {
  const lineComment = language === 'python' ? '#' : '//';
  let out = '';
  let i = 0;
  const n = code.length;
  while (i < n) {
    const ch = code[i];
    // Comments
    if (code.startsWith(lineComment, i)) {
      while (i < n && code[i] !== '\n') i++;
      continue;
    }
    if (language !== 'python' && code.startsWith('/*', i)) {
      const end = code.indexOf('*/', i + 2);
      const stop = end < 0 ? n : end + 2;
      out += code.slice(i, stop).replace(/[^\n]/g, ' ');
      i = stop;
      continue;
    }
    // Python triple-quoted strings
    if (language === 'python' && (code.startsWith('"""', i) || code.startsWith("'''", i))) {
      const quote = code.slice(i, i + 3);
      const end = code.indexOf(quote, i + 3);
      const stop = end < 0 ? n : end + 3;
      out += quote + code.slice(i + 3, Math.max(i + 3, stop - 3)).replace(/[^\n]/g, ' ') + quote;
      i = stop;
      continue;
    }
    // Ordinary strings (and TS template literals, kept simple: their ${}
    // contents are blanked too, which only ever hides code, never adds it).
    if (ch === '"' || ch === "'" || (ch === '`' && language === 'typescript')) {
      let j = i + 1;
      while (j < n && code[j] !== ch) {
        if (code[j] === '\\') j++;
        else if (code[j] === '\n' && ch !== '`') break;
        j++;
      }
      out += ch + ' '.repeat(Math.max(0, Math.min(j, n) - i - 1)) + (j < n && code[j] === ch ? ch : '');
      i = j < n && code[j] === ch ? j + 1 : j;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

const IMPORT_LINE: Record<PracticeLanguage, RegExp> = {
  python: /^\s*(import\s|from\s+\S+\s+import\s)/,
  typescript: /^\s*import\s/,
  cpp: /^\s*#\s*include\b/,
  java: /^\s*import\s/,
};

/** Code with strings and comments blanked, import/include lines left as written. */
export function stripForAnalysis(code: string, language: PracticeLanguage): string {
  const original = code.replace(/\r\n/g, '\n').split('\n');
  const stripped = blankStringsAndComments(code.replace(/\r\n/g, '\n'), language).split('\n');
  return stripped.map((line, i) => (IMPORT_LINE[language].test(original[i] ?? '') ? original[i] : line)).join('\n');
}

export function matchesAny(detectors: Detector[], stripped: string): boolean {
  return detectors.some((d) => (typeof d === 'function' ? d(stripped) : new RegExp(d.source, d.flags.replace('g', '')).test(stripped)));
}

export interface ConceptScan {
  foundation: string[];
  advanced: string[];
}

/** Which catalog concepts this code appears to use. */
export function scanConcepts(code: string, language: PracticeLanguage): ConceptScan {
  const stripped = stripForAnalysis(code, language);
  const cat = catalogFor(language);
  return {
    foundation: cat.foundation.filter((c) => c.detect.length > 0 && matchesAny(c.detect, stripped)).map((c) => c.id),
    advanced: cat.advanced.filter((c) => matchesAny(c.evidence, stripped)).map((c) => c.id),
  };
}

export interface EvidenceResult {
  conceptId: string;
  label: string;
  passed: boolean;
}

/** One code check per required advanced concept: does this code show it in use? */
export function conceptEvidence(code: string, language: PracticeLanguage, conceptIds: string[]): EvidenceResult[] {
  const stripped = stripForAnalysis(code, language);
  const cat = catalogFor(language);
  return conceptIds.map((id) => {
    const c = cat.advanced.find((a) => a.id === id);
    return { conceptId: id, label: c?.evidenceLabel ?? id, passed: c ? matchesAny(c.evidence, stripped) : false };
  });
}

/** Non-blank, non-comment lines: a rough size measure for "minimal scaffolding". */
export function significantLines(code: string, language: PracticeLanguage): number {
  return blankStringsAndComments(code.replace(/\r\n/g, '\n'), language)
    .split('\n')
    .filter((l) => l.trim() !== '' && !/^[\s{}();]*$/.test(l) && !/^\s*(pass|\.\.\.)\s*$/.test(l)).length;
}
