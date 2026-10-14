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
 * during the token-usage investigation: this pre-filter was firing on
 * effectively every reply before it existed.
 */
export const GUARDRAIL_SKIP_MAX_LENGTH = 200;

/**
 * Sequential Curriculum `practice_group` items (a lesson's optional trailing
 * pool of debugging exercises) stay hidden from every non-admin request, and
 * non-gating in the unlock math, until this flips to true. An admin always
 * sees them (their own client can locally toggle a "preview as launched"
 * view without a server round-trip) so authoring/validation can continue
 * without the content being live for real learners yet. Flip this once the
 * post-launch debugging-exercise pass is actually ready to ship. See
 * `seq.controller.ts`'s `topicView()` and `SeqTopic.ts`'s gating functions.
 */
export const PRACTICE_GROUPS_LAUNCHED = false;

/**
 * `problemBank.service.ts`'s bank-first lookup (Module 2 code review,
 * algorithms/data structures finding: "the bank lookup has arbitrary
 * selection order"): instead of returning the single least-served matching
 * problem every time (deterministic, but zero variety — every learner
 * hitting the same query would get the identical problem until its
 * timesServed count ticks past the next one), the query fetches this many
 * least-recently-served candidates and picks uniformly at random among
 * them. Larger = more variety, weaker least-served fairness (a
 * heavily-served problem could still be picked if it's within the pool);
 * smaller = stronger fairness, less variety. 5 is a small enough pool that
 * fairness still dominates, while avoiding the fully-deterministic case (1).
 */
export const BANK_SELECTION_POOL_SIZE = 5;
