import { MODEL_LIGHT, MODEL_REASONING } from '../aiClient';
import type { TutorContext } from '../tutorContext.service';

// Which model answers a learner's message (owner decision 2026-10-12): Haiku
// 5.5 for general questions, Sonnet when the learner seems stuck. Plain rules,
// no extra AI call, so routing adds no cost or delay.

/** Things learners say when they're stuck or frustrated. */
const STUCK_PHRASES = [
  /\bstuck\b/,
  /\bi(?:'?m| am)\s+(?:so\s+|really\s+|totally\s+)?(?:confused|lost)\b/,
  /\b(?:don'?t|do not|still don'?t)\s+(?:get|understand)\b/,
  /\bstill\s+(?:not|doesn'?t|isn'?t|wrong|broken|failing|getting|stuck|confused|the same)\b/,
  /\b(?:doesn'?t|does not|won'?t|isn'?t|not)\s+work(?:ing)?\b/,
  /\bgive up\b|\bgiving up\b/,
  /\bno idea\b|\bidk\b|\bclueless\b/,
  /\bfrustrat/,
  /\bmakes? no sense\b|\bdoesn'?t make sense\b/,
  /\bi can'?t (?:figure|get|see|find|work)\b/,
  /\bwhat am i (?:doing|missing)\b/,
  /\btried everything\b|\bnothing works\b/,
  /\bsame (?:error|problem|thing|result)\b/,
  /\bkeep (?:getting|failing)\b/,
];

/** How long a session goes without a success before the learner counts as stuck. */
const LONG_SESSION_MESSAGES = 8;
const LONG_SESSION_MINUTES = 10;
/** After a failing run, this many messages in. */
const FAILING_RUN_MESSAGES = 4;

export function soundsStuck(message: string): boolean {
  const m = message.toLowerCase();
  return STUCK_PHRASES.some((re) => re.test(m));
}

function latestRunFailed(context: TutorContext): boolean {
  const r = context.latestSubmissionResult?.trim();
  if (!r) return false;
  return !/^pass$/i.test(r) && !/every test passed/i.test(r);
}

/** Does the learner seem stuck, from what they wrote and how the session is going? */
export function seemsStuck(context: TutorContext, learnerMessage: string): boolean {
  if (soundsStuck(learnerMessage)) return true;
  const s = context.stuckSignal;
  if (s.hasSucceededSinceSessionStart) return false;
  if (s.messageCount >= LONG_SESSION_MESSAGES && s.minutesSinceSessionStart >= LONG_SESSION_MINUTES) return true;
  return s.messageCount >= FAILING_RUN_MESSAGES && latestRunFailed(context);
}

export function replyModelFor(context: TutorContext, learnerMessage: string): string {
  return seemsStuck(context, learnerMessage) ? MODEL_REASONING : MODEL_LIGHT;
}
