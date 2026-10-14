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
 * Free-trial length. The trial is run by Stripe (card collected up front,
 * first charge when it ends) and is offered once per email address.
 */
export const TRIAL_LENGTH_DAYS = 7;

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
 * during a token-usage investigation: this pre-filter was
 * firing on effectively every reply before it existed.
 */
export const GUARDRAIL_SKIP_MAX_LENGTH = 200;

/**
 * Sequential Curriculum `practice_group` items (a lesson's optional trailing
 * pool of debugging exercises — see `_FORMAT.md` §6 rule 1a) stay hidden from
 * every non-admin request, and non-gating in the unlock math, until this
 * flips to true. An admin always sees them (their own client can locally
 * toggle a "preview as launched" view without a server round-trip) so
 * authoring/validation can continue on Topics 5+ without the content being
 * live for real learners yet. Flip this once the post-launch debugging-
 * exercise pass is actually ready to ship. See `seq.controller.ts`'s
 * `topicView()` and `SeqTopic.ts`'s gating functions.
 */
export const PRACTICE_GROUPS_LAUNCHED = false;

/**
 * How many of a Sequential Curriculum "Ask Trak" session's most recent
 * messages get replayed to the model each turn (see tutor.controller.ts's
 * sendMessage). This session is deliberately long-lived — one continuous
 * thread per learner that follows them from item to item rather than
 * resetting per item (see TutorSession.contextId/lastContextSwitchAt) — so
 * without a cap, a well-used thread would eventually replay its ENTIRE
 * history, and cost, on every single message. The full transcript still
 * lives in TutorSession.messages either way; this only bounds what's sent to
 * the API per call, not what's stored. 40 messages is ~20 exchanges — enough
 * "moderate" context to feel continuous without unbounded growth. Only
 * applied to `seqItem` sessions; problem/practiceAttempt sessions are
 * short-lived enough already that this would rarely, if ever, trim them.
 */
export const TUTOR_CONVERSATION_WINDOW_MESSAGES = 40;

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

/**
 * The Terms of Service / Privacy Policy version a learner accepts on Billing.
 * Bump it whenever the published text changes materially; each acceptance is
 * stored with the version that was shown.
 */
export const TERMS_VERSION = '2026-10-13.1';

/**
 * Learner allowances (services/usageLimits.service.ts). Periods reset at
 * midnight US Eastern: Trak weekly on Monday, the trial's Trak allowance daily,
 * practice generation on the 1st of the month. Admins are exempt.
 */
export const TRAK_QUESTIONS_PER_WEEK = 100;
export const TRIAL_TRAK_QUESTIONS_PER_DAY = 20;
export const PRACTICE_GENERATIONS_PER_MONTH = 20;
/** For the whole free trial, not per period. */
export const TRIAL_PRACTICE_GENERATIONS = 5;
/**
 * Combined monthly AI limit per learner (owner decision 2026-10-12): estimated
 * spend on Trak AND new practice generation in a calendar month (US Eastern).
 * Guarantees a founding member ($23.99 from 2026-10-12, ~$1.28 Stripe fees)
 * leaves at least ~$16.71. Bought tutoring-pack questions raise it (see below).
 */
export const AI_MONTHLY_COST_BACKSTOP_USD = 6;
/**
 * Most one Trak chat message may cost (owner decision 2026-10-12): Trak's reply
 * plus every check it triggers. Enforced by services/tutor/budget.ts.
 */
export const TRAK_MESSAGE_BUDGET_USD = 0.015;
/** Trak speed limit: a burst of this many messages, then one more every TRAK_REFILL_MS. */
export const TRAK_BURST = 5;
export const TRAK_REFILL_MS = 3 * 60 * 1000;

/**
 * Tutoring packs: extra Trak questions a member buys outright (Stripe, paid
 * immediately). They're used only after the weekly allowance runs out and never
 * expire. Founding-member discounts don't apply. Owner-set prices 2026-10-11.
 */
export const TRAK_PACKS = [
  { id: 'pack-50', questions: 50, priceCents: 249 },
  { id: 'pack-150', questions: 150, priceCents: 599 },
  { id: 'pack-400', questions: 400, priceCents: 1199 },
] as const;
export type TrakPackId = (typeof TRAK_PACKS)[number]['id'];
/**
 * Bought questions raise the hidden monthly AI backstop by this much each when
 * used, so a learner who paid for extra questions never hits it early.
 */
export const BACKSTOP_ALLOWANCE_PER_BONUS_QUESTION_USD = 0.015;

/**
 * Practice Mode assignment generation (practice/jobs.ts): an initial attempt
 * plus at most two repair attempts, never more than the general generation cap
 * above. Each job also has a token and wall-clock budget; whichever runs out
 * first ends the job as failed, and nothing unvalidated is ever published.
 */
export const PRACTICE_MAX_GENERATION_ATTEMPTS = Math.min(3, MAX_GENERATION_ATTEMPTS);
export const PRACTICE_GENERATION_TOKEN_BUDGET = 150_000;
export const PRACTICE_GENERATION_TIME_BUDGET_MS = 10 * 60_000;
/** How long a generation job's claim lasts without renewal. Renewed before each
 * step, so it only needs to outlast the slowest single step (one model call). */
export const PRACTICE_JOB_LEASE_MS = 5 * 60_000;

// ---- Growth goal (Admin, Growth tab) ----
// Owner's year-one goal: this many paying members one year after launch.
export const GROWTH_GOAL_MEMBERS = 250;
// Used when FOUNDER_LAUNCH_DATE isn't set yet (planned soft launch).
export const GROWTH_DEFAULT_LAUNCH_DATE = '2026-10-31';
// Planning assumptions until there's enough real data (20+ members / finished trials).
export const GROWTH_ASSUMED_MONTHLY_CHURN = 0.08;
export const GROWTH_ASSUMED_TRIAL_CONVERSION = 0.4;
