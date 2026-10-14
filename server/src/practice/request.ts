import crypto from 'crypto';
import {
  BASICS_CURRICULUM_VERSION,
  MAX_STRETCH_CONCEPTS,
  PracticeLanguage,
  PracticeMode,
  PracticeScope,
  PRACTICE_SCOPES,
  SCOPES,
  advancedById,
  catalogFor,
  foundationById,
  resolveAdvancedConcept,
  suggestAdvancedConcepts,
} from './catalog';

// Turns what the learner picked into a normalized, validated request, or into
// a clear explanation of why it can't be served as asked. Nothing here ever
// silently changes the language, scope, count or named concepts: a conflict is
// returned with options, and the learner chooses.

export const PRACTICE_RUNTIME_VERSION = 'sandbox-2026.10';

export interface PracticeRequestInput {
  language: PracticeLanguage;
  mode: PracticeMode;
  scope: PracticeScope;
  conceptCount?: number;
  conceptIds?: string[];
  conceptText?: string;
  /** The learner's skill checklist. Omitted = their default checklist. */
  foundationIds?: string[];
}

export interface NormalizedRequest {
  language: PracticeLanguage;
  mode: PracticeMode;
  scope: PracticeScope;
  /** 0 in basics mode, exactly 1–3 in stretch mode. */
  conceptCount: number;
  /** Concepts every matching assignment must include: the named ones plus the advanced concepts they depend on. */
  requiredConceptIds: string[];
  /** The ones the learner actually named (for display). */
  namedConceptIds: string[];
  permittedFoundationIds: string[];
  basicsVersion: string;
  runtimeVersion: string;
  /** Set when starting a practice library entry: build that brief, not just any fit. */
  libraryId?: string;
}

export interface RequestSuggestion {
  label: string;
  /** The changed fields that would make the request work. */
  patch: Partial<Pick<PracticeRequestInput, 'scope' | 'conceptCount' | 'conceptIds' | 'foundationIds'>>;
}

export interface RequestConflict {
  code:
    | 'unknown-concept'
    | 'too-many-concepts'
    | 'dependency-exceeds-count'
    | 'incompatible-concepts'
    | 'missing-foundation'
    | 'scope-needs-foundation'
    | 'no-compatible-combination'
    | 'advanced-in-basics'
    | 'invalid';
  message: string;
  suggestions: RequestSuggestion[];
}

export type NormalizeResult = { ok: true; request: NormalizedRequest } | { ok: false; conflict: RequestConflict };

const conflict = (c: RequestConflict): NormalizeResult => ({ ok: false, conflict: c });

function foundationNames(language: PracticeLanguage, ids: string[]): string {
  return ids.map((id) => foundationById(language, id)?.name ?? id).join(', ');
}

function advancedNames(language: PracticeLanguage, ids: string[]): string {
  return ids.map((id) => advancedById(language, id)?.name ?? id).join(', ');
}

/** The named concepts plus every advanced concept they depend on (transitively). */
export function advancedClosure(language: PracticeLanguage, ids: string[]): string[] {
  const seen = new Set<string>();
  const visit = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    for (const dep of advancedById(language, id)?.requiresAdvanced ?? []) visit(dep);
  };
  ids.forEach(visit);
  return [...seen].sort();
}

/** The first incompatible pair in a set, if any. */
export function findIncompatibility(language: PracticeLanguage, ids: string[]): { a: string; b: string; reason: string } | null {
  for (const a of ids) {
    for (const inc of advancedById(language, a)?.incompatibleWith ?? []) {
      if (ids.includes(inc.id)) return { a, b: inc.id, reason: inc.reason };
    }
  }
  return null;
}

/** Foundation concepts a set of advanced concepts needs the learner to be allowed to use. */
export function foundationNeededBy(language: PracticeLanguage, advancedIds: string[]): string[] {
  return [...new Set(advancedIds.flatMap((id) => advancedById(language, id)?.requiresFoundation ?? []))].sort();
}

/** Is this exact set a valid stretch combination for these permitted skills? */
export function isValidCombination(language: PracticeLanguage, ids: string[], permitted: string[]): boolean {
  const closure = advancedClosure(language, ids);
  if (closure.length !== ids.length) return false; // a dependency is missing from the set
  if (findIncompatibility(language, ids)) return false;
  return foundationNeededBy(language, ids).every((f) => permitted.includes(f));
}

/**
 * Pick a random valid combination of exactly `count` concepts that contains
 * `required`. Used at generation time for random or partly specified requests
 * (never before searching the bank). Returns null when none exists.
 */
export function pickConceptCombination(
  language: PracticeLanguage,
  required: string[],
  count: number,
  permitted: string[],
  rand: () => number = Math.random
): string[] | null {
  const candidates = catalogFor(language)
    .advanced.map((c) => c.id)
    .filter((id) => !required.includes(id))
    .sort(() => rand() - 0.5);

  const search = (chosen: string[], from: number): string[] | null => {
    const closure = advancedClosure(language, chosen);
    if (closure.length > count) return null;
    if (closure.length === count) return isValidCombination(language, closure, permitted) ? closure : null;
    for (let i = from; i < candidates.length; i++) {
      if (chosen.includes(candidates[i])) continue;
      const found = search([...chosen, candidates[i]], i + 1);
      if (found) return found;
    }
    return null;
  };
  return search(required, 0);
}

/** Parse "regex, classes and json" into concept ids; returns the parts it couldn't resolve. */
export function resolveConceptText(language: PracticeLanguage, text: string): { ids: string[]; unresolved: string[] } {
  const parts = text
    .split(/,|;|\band\b|\n/i)
    .map((p) => p.trim())
    .filter(Boolean);
  const ids: string[] = [];
  const unresolved: string[] = [];
  for (const p of parts) {
    const id = resolveAdvancedConcept(language, p);
    if (id) ids.push(id);
    else unresolved.push(p);
  }
  return { ids, unresolved };
}

export function normalizePracticeRequest(input: PracticeRequestInput, defaultFoundation: string[]): NormalizeResult {
  const cat = catalogFor(input.language);
  if (!cat) return conflict({ code: 'invalid', message: 'That language is not available for practice yet.', suggestions: [] });

  const allFoundation = cat.foundation.map((f) => f.id);
  const unknownFoundation = (input.foundationIds ?? []).filter((id) => !allFoundation.includes(id));
  if (unknownFoundation.length) {
    return conflict({ code: 'invalid', message: `Unknown skills: ${unknownFoundation.join(', ')}.`, suggestions: [] });
  }
  const permitted = [...new Set(input.foundationIds ?? defaultFoundation)].sort();

  // Scope needs a minimum set of skills to fill its workload.
  const scopeMissing = cat.minFoundationForScope[input.scope].filter((f) => !permitted.includes(f));
  if (scopeMissing.length) {
    const feasible = PRACTICE_SCOPES.filter((s) => cat.minFoundationForScope[s].every((f) => permitted.includes(f)));
    return conflict({
      code: 'scope-needs-foundation',
      message: `A ${SCOPES[input.scope].label.toLowerCase()} assignment needs these skills, which aren't on your list: ${foundationNames(input.language, scopeMissing)}.`,
      suggestions: [
        ...feasible.map((s) => ({ label: `Make it ${SCOPES[s].label.toLowerCase()} instead`, patch: { scope: s } })),
        { label: `Add ${foundationNames(input.language, scopeMissing)} to my skills`, patch: { foundationIds: [...permitted, ...scopeMissing].sort() } },
      ],
    });
  }

  const base = {
    language: input.language,
    mode: input.mode,
    scope: input.scope,
    permittedFoundationIds: permitted,
    basicsVersion: BASICS_CURRICULUM_VERSION,
    runtimeVersion: PRACTICE_RUNTIME_VERSION,
  };

  if (input.mode === 'basics') {
    if ((input.conceptCount ?? 0) > 0 || input.conceptIds?.length || input.conceptText?.trim()) {
      return conflict({
        code: 'advanced-in-basics',
        message: 'Practice the basics only uses skills from the basics. Switch to Stretch out to add new concepts.',
        suggestions: [],
      });
    }
    return { ok: true, request: { ...base, conceptCount: 0, requiredConceptIds: [], namedConceptIds: [] } };
  }

  const count = input.conceptCount ?? 0;
  if (!Number.isInteger(count) || count < 1 || count > MAX_STRETCH_CONCEPTS) {
    return conflict({ code: 'invalid', message: `Choose 1 to ${MAX_STRETCH_CONCEPTS} new concepts.`, suggestions: [] });
  }

  // Named concepts: ids from the picker plus anything typed.
  const unknownIds = (input.conceptIds ?? []).filter((id) => !advancedById(input.language, id));
  const fromText = input.conceptText?.trim() ? resolveConceptText(input.language, input.conceptText) : { ids: [], unresolved: [] };
  const unresolved = [...unknownIds, ...fromText.unresolved];
  if (unresolved.length) {
    const suggestions = unresolved.flatMap((u) => suggestAdvancedConcepts(input.language, u));
    return conflict({
      code: 'unknown-concept',
      message: `We don't have ${unresolved.map((u) => `"${u}"`).join(', ')} as a ${cat.label} practice concept yet.`,
      suggestions: [...new Set(suggestions)].map((id) => ({
        label: `Use ${advancedById(input.language, id)!.name}`,
        patch: { conceptIds: [...new Set([...(input.conceptIds ?? []).filter((c) => !unknownIds.includes(c)), ...fromText.ids, id])] },
      })),
    });
  }
  const named = [...new Set([...(input.conceptIds ?? []), ...fromText.ids])].sort();

  if (named.length > count) {
    return conflict({
      code: 'too-many-concepts',
      message: `You picked ${named.length} concepts but asked for ${count}. Raise the count or remove some.`,
      suggestions: named.length <= MAX_STRETCH_CONCEPTS ? [{ label: `Use ${named.length} new concepts`, patch: { conceptCount: named.length } }] : [],
    });
  }

  const required = advancedClosure(input.language, named);
  if (required.length > count) {
    const extra = required.filter((id) => !named.includes(id));
    return conflict({
      code: 'dependency-exceeds-count',
      message: `${advancedNames(input.language, named)} builds on ${advancedNames(input.language, extra)}, so this needs ${required.length} new concepts, not ${count}.`,
      suggestions: required.length <= MAX_STRETCH_CONCEPTS ? [{ label: `Use ${required.length} new concepts`, patch: { conceptCount: required.length } }] : [],
    });
  }

  const clash = findIncompatibility(input.language, required);
  if (clash) {
    return conflict({
      code: 'incompatible-concepts',
      message: `${advancedNames(input.language, [clash.a])} and ${advancedNames(input.language, [clash.b])} can't be combined here: ${clash.reason}.`,
      suggestions: [clash.a, clash.b].map((keep) => ({
        label: `Keep ${advancedNames(input.language, [keep])} only`,
        patch: { conceptIds: named.filter((id) => id !== (keep === clash.a ? clash.b : clash.a)) },
      })),
    });
  }

  const missing = foundationNeededBy(input.language, required).filter((f) => !permitted.includes(f));
  if (missing.length) {
    return conflict({
      code: 'missing-foundation',
      message: `${advancedNames(input.language, required)} also needs ${foundationNames(input.language, missing)}, which isn't on your skills list.`,
      suggestions: [{ label: `Add ${foundationNames(input.language, missing)} to my skills`, patch: { foundationIds: [...permitted, ...missing].sort() } }],
    });
  }

  if (!pickConceptCombination(input.language, required, count, permitted)) {
    return conflict({
      code: 'no-compatible-combination',
      message: `There aren't enough compatible concepts to make ${count} with your current skills${named.length ? ` and ${advancedNames(input.language, named)}` : ''}.`,
      suggestions: count > 1 ? [{ label: `Use ${count - 1} new concept${count - 1 === 1 ? '' : 's'}`, patch: { conceptCount: count - 1 } }] : [],
    });
  }

  return { ok: true, request: { ...base, conceptCount: count, requiredConceptIds: required, namedConceptIds: named } };
}

/** Stable key for equivalent requests (used to coordinate generation jobs). */
export function requestKey(req: NormalizedRequest): string {
  const canonical = JSON.stringify([
    req.language,
    req.mode,
    req.scope,
    req.conceptCount,
    req.requiredConceptIds,
    req.permittedFoundationIds,
    req.basicsVersion,
    req.runtimeVersion,
    // Only library requests add this, so every other request keeps its old key.
    ...(req.libraryId ? [req.libraryId] : []),
  ]);
  return crypto.createHash('sha256').update(canonical).digest('hex');
}
