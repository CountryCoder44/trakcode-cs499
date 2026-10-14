import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { getAnthropicClient, MODEL_LIGHT } from '../aiClient';
import { executeCode } from '../executionClient';
import { TutorContext } from '../tutorContext.service';
import { logAiUsage } from '../aiUsage.service';
import { renderTranscript } from './shared';
import { GUARDRAIL_SKIP_MAX_LENGTH } from '../../config/constants';
import { clip, MessageBudget } from './budget';

/** Longest earlier turn the solution check reads (characters). */
export const GUARDRAIL_TURN_CHARS = 600;
/** Output limit for the solution check (its rationale is at most 600 characters). */
export const GUARDRAIL_MAX_TOKENS = 260;

const CODE_BLOCK_RE = /```(?:\w+)?\n([\s\S]*?)```/g;

/**
 * Guardrail layer 1 — real execution. Spec §6: "flagging responses that
 * contain a complete, directly-pasteable solution (e.g., a code block that
 * would pass all test cases if submitted as-is)". Verified by actually
 * running the code against the problem's own test cases, not by asking a
 * model to judge itself. Only applies where we have test cases to run
 * against (problem context) — see layer 2 for curriculum-item coverage.
 * Purely a "does this look like a complete solution" detector — it has no
 * conversational awareness and never will; consent is judged in layer 2.
 */
async function sandboxGuardrailFlags(responseText: string, context: TutorContext): Promise<boolean> {
  if ((context.kind !== 'problem' && context.kind !== 'practiceAttempt') || !context.problemTestCases || !context.problemLanguage) {
    return false;
  }

  const blocks = [...responseText.matchAll(CODE_BLOCK_RE)].map((m) => m[1]);
  for (const code of blocks) {
    if (code.trim().length < 10) continue; // too short to plausibly be a full solution
    try {
      const result = await executeCode(context.problemLanguage, code, context.problemTestCases, {
        timeoutMs: 5000,
        files: context.problemFiles,
      });
      if (result.allPassed) return true;
    } catch {
      // A code block that doesn't even run isn't a leaked solution — ignore execution errors here.
    }
  }
  return false;
}

const solutionClassificationSchema = z.object({
  // Placed first deliberately — structured-output fields are generated in
  // schema order, so this acts as inline chain-of-thought ahead of the more
  // subjective `offeredAndConsented` judgment, without a separate thinking call.
  // 300 was too tight in practice: explaining BOTH "is this a complete
  // solution" and "was it offered-and-consented-to" in the same field
  // regularly ran past it once a real conversation was involved, which threw
  // a validation error out of messages.parse() — caught below and failed
  // open to `consented: false`, silently defeating the whole consent-reveal
  // path even after a clean, explicit offer-and-agreement exchange. Found by
  // live-testing the reveal flow end-to-end, not by inspection. 600 gives
  // real headroom; the "one or two sentences" instruction keeps it from
  // drifting long on its own.
  rationale: z
    .string()
    .max(600)
    .describe(
      'One or two sentences: what in the reply makes it a complete solution or not, and whether an explicit ' +
        'offer-and-consent exchange occurred in the immediately preceding turns. Reason here before answering below.'
    ),
  containsCompleteSolution: z
    .boolean()
    .describe(
      'true only if the response hands the learner a complete, directly-usable solution or answer they could ' +
        'submit as-is to finish the problem/exercise themselves. Hints, conceptual nudges, pointing at a bug, ' +
        'and small pseudo-code fragments are all fine and must NOT be flagged.'
    ),
  offeredAndConsented: z
    .boolean()
    .describe(
      'true only when, in the turns immediately preceding this reply, Trak explicitly offered to show the ' +
        'complete solution (e.g. "want me to just show you a solution?") and the learner explicitly agreed. ' +
        'false whenever containsCompleteSolution is false, or no such explicit offer-and-agreement exchange occurred.'
    ),
});

/**
 * Guardrail layer 2 — cheap LLM classification, conversation-aware. Runs for
 * every response (both problem and curriculum-item context), unlike layer 1
 * which needs test cases to execute against. This is the only layer that
 * can judge "was this legitimately earned" — layer 1 has no notion of
 * conversation history.
 *
 * `client` is injected (defaults to the real singleton) so this — and
 * everything that calls it — is unit-testable with a fake client instead of
 * module-mocking `aiClient.ts`.
 */
async function llmGuardrailFlags(
  responseText: string,
  context: TutorContext,
  recentTurns: Anthropic.MessageParam[],
  client: Anthropic | null,
  budget?: MessageBudget
): Promise<{ solutionDetected: boolean; consented: boolean }> {
  if (!client) return { solutionDetected: false, consented: false }; // no key configured — caller already handles this upstream

  const prompt = [
    `A Socratic coding tutor named Trak is talking to a learner working on "${context.title}". Here is the recent conversation, ending with Trak's newest reply:`,
    '---',
    // Earlier turns are clipped (they only matter for "was it offered and
    // agreed to"); Trak's newest reply is judged in full.
    renderTranscript(
      recentTurns.map((m, i, all) => ({
        role: m.role,
        content: i === all.length - 1 ? m.content : clip(typeof m.content === 'string' ? m.content : '', GUARDRAIL_TURN_CHARS),
      }))
    ),
    '---',
    'Does the FINAL reply above (the last "Trak:" turn) contain a complete, directly-usable solution or answer? ' +
      'If so, was it legitimately offered by Trak and agreed to by the learner in the turns immediately before it?',
  ].join('\n');

  try {
    const response = await client.messages.parse({
      model: MODEL_LIGHT,
      // Haiku 5.5 thinks by default and thinking counts as output; a check doesn't need it.
      thinking: { type: 'disabled' },
      max_tokens: GUARDRAIL_MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }],
      output_config: { format: zodOutputFormat(solutionClassificationSchema) },
    });
    logAiUsage({ userId: context.userId, modelId: MODEL_LIGHT, tier: 'fast', purpose: 'tutor-guardrail', usage: response.usage });
    budget?.charge(MODEL_LIGHT, response.usage);
    return {
      solutionDetected: response.parsed_output?.containsCompleteSolution ?? false,
      consented: response.parsed_output?.offeredAndConsented ?? false,
    };
  } catch (err) {
    // Fail CLOSED, not open. By the time we're in this function the reply
    // has already passed `implausibleSolutionLeak` in evaluateGuardrail —
    // it has a code fence or is long enough to plausibly BE a full solution
    // — so a classifier outage here means "can't rule out a leak," not
    // "no leak." Previously this returned `solutionDetected: false`, which
    // makes `solutionPresent = sandboxDetected || llmResult.solutionDetected`
    // depend entirely on the sandbox layer — and the sandbox layer only
    // exists for sessions with real test cases; a `seqItem`-context session
    // (Ask Trak on a lesson item) has no sandbox check at all, so an outage there silently
    // disabled the ONLY guardrail layer it had, waving a genuinely leaked
    // solution straight through. Returning `solutionDetected: true` here
    // instead makes `evaluateGuardrail` flag the reply and trigger the
    // existing stricter-retry loop (MAX_GUARDRAIL_ATTEMPTS), a rare, cheap
    // extra regeneration on a false positive, versus an unverified reply
    // reaching the learner on a false negative.
    // eslint-disable-next-line no-console
    console.error('tutor guardrail classification failed, failing closed (treating as an unverified possible solution)', err);
    return { solutionDetected: true, consented: false };
  }
}

/**
 * Cheap, no-API-call pre-filter for the guardrail's Haiku classification
 * call (llmGuardrailFlags) — token-usage investigation found this firing on
 * literally every single Trak reply, including plain acknowledgments and
 * short calibration chit-chat. Per solutionClassificationSchema, a reply can
 * only BE "a complete, directly-usable solution or answer" by either
 * containing a code block or being long enough to fully spell one out in
 * prose — a short reply with no code fence at all is never that. Left
 * deliberately conservative: ANY code fence, or ANY length at/above the
 * threshold, still goes through full classification — this only skips the
 * clear-cut case, and the sandbox layer (real code execution) is unaffected
 * since it independently requires a code fence too.
 */
function implausibleSolutionLeak(responseText: string): boolean {
  return !responseText.includes('```') && responseText.trim().length < GUARDRAIL_SKIP_MAX_LENGTH;
}

/**
 * Decides whether a tutor reply should be blocked (`flagged`) or was a
 * legitimate, consented-to reveal (`revealed`). Combines both guardrail
 * layers: a solution is present if EITHER layer detects one, but only layer
 * 2 can judge consent (layer 1 has no conversational awareness). `flagged`
 * and `revealed` are mutually exclusive by construction.
 *
 * `client` is injected — pass a fake `Anthropic`-shaped object in tests
 * (see `__tests__/guardrail.test.ts`) instead of mocking `aiClient.ts`.
 * Defaults to the real singleton so existing callers don't need to change.
 */
export async function evaluateGuardrail(
  responseText: string,
  context: TutorContext,
  recentTurns: Anthropic.MessageParam[],
  client: Anthropic | null = getAnthropicClient(),
  budget?: MessageBudget
): Promise<{ flagged: boolean; revealed: boolean }> {
  if (implausibleSolutionLeak(responseText)) {
    return { flagged: false, revealed: false };
  }

  const [sandboxDetected, llmResult] = await Promise.all([
    sandboxGuardrailFlags(responseText, context),
    llmGuardrailFlags(responseText, context, recentTurns, client, budget),
  ]);
  const solutionPresent = sandboxDetected || llmResult.solutionDetected;
  // Flag only when a solution was detected (by either layer) AND it wasn't
  // legitimately offered-and-consented-to — only layer 2 can judge consent,
  // since sandbox execution has no notion of "was this offered." A reveal
  // actually happened exactly when a solution was present AND it WAS
  // consented to — the accepted case, mutually exclusive with flagged.
  return { flagged: solutionPresent && !llmResult.consented, revealed: solutionPresent && llmResult.consented };
}
