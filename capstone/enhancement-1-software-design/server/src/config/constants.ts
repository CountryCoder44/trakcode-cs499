/**
 * Cross-cutting business tunables that used to be scattered as bare numeric
 * literals across several unrelated files with no single place to see or
 * change them together (Module 2 code review, "configuration and magic
 * values"). Centralized here ONLY when a value is a genuine product/business
 * decision that's meaningful to see in context with the others — a purely
 * local implementation detail (a crypto algorithm name, a WAV header size, a
 * cache-pricing multiplier) is deliberately left next to the one function
 * that uses it instead of being pulled here for its own sake. Moving
 * everything numeric into one file regardless of scope would trade one kind
 * of noise for another.
 */

/**
 * How long a new signup's trial lasts. Not specified in the original tech
 * spec — this is a placeholder pending confirmation against the PRD, kept
 * here (not buried in auth.controller.ts) so it's visible next to the other
 * values that actually shape product behavior.
 */
export const TRIAL_LENGTH_DAYS = 14;

/**
 * How many times AI problem generation retries before giving up and flagging
 * the attempt for manual review (see `problemGeneration.service.ts`). Each
 * attempt costs a real model call plus a real sandbox validation run, so
 * this is a genuine cost/reliability trade-off, not an arbitrary number.
 */
export const MAX_GENERATION_ATTEMPTS = 3;

/**
 * The AI tutor's guardrail retry budget (see `services/tutor/guardrail.ts`
 * and `services/tutor.service.ts`): how many times a flagged reply gets
 * regenerated "stricter" before falling back to a safe, generic nudge
 * instead of ever surfacing an unverified reply to the learner.
 */
export const MAX_GUARDRAIL_ATTEMPTS = 2;

/**
 * Below this length, a tutor reply with no code fence cannot plausibly BE "a
 * complete, directly-usable solution" per the guardrail classifier's own
 * schema — so the classifier call is skipped outright rather than spending a
 * real API call classifying an obviously-safe short reply. Found to matter
 * during the token-usage investigation (see CLAUDE.md): this pre-filter was
 * firing on effectively every reply before it existed.
 */
export const GUARDRAIL_SKIP_MAX_LENGTH = 200;
