import { getAnthropicClient, MODEL_LIGHT, MODEL_REASONING } from './aiClient';
import { TutorContext } from './tutorContext.service';
import { logAiUsage, outputRateUsd, worstCaseCostUsd, worstInputRateUsd } from './aiUsage.service';
import { AiUnavailableError } from '../errors/AppError';
import { MAX_GUARDRAIL_ATTEMPTS } from '../config/constants';
import { buildSystemPrompt, withCacheBreakpointOnLastMessage } from './tutor/promptBuilder';
import { evaluateGuardrail, GUARDRAIL_MAX_TOKENS, GUARDRAIL_TURN_CHARS } from './tutor/guardrail';
import { estimateMessagesTokens, estimateTokens, MessageBudget } from './tutor/budget';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Thin orchestration facade over the AI tutor. This file used to hold
 * everything — prompt construction, both guardrail layers, three separate
 * classifier calls, and memory extraction — in one ~660-line module where
 * every piece reached for the Anthropic client singleton directly, so none
 * of it could be unit-tested without a real network call (Module 2 code
 * review, finding: "the tutor service violates single-responsibility and is
 * hard to test"). It's now split into independently-testable modules under
 * `./tutor/`, each with the Anthropic client as an injected parameter rather
 * than a hard-coded dependency:
 *   - `tutor/promptBuilder.ts` — builds the system prompt and cache breakpoints.
 *   - `tutor/guardrail.ts` — the two-layer leaked-solution guardrail.
 *   - `tutor/classifiers.ts` — the readiness-to-practice classifier.
 *   - `tutor/memory.ts` — cross-session memory extraction.
 * This module owns only the one thing that genuinely needs to coordinate
 * all of them: the actual reply-generation retry loop. `generateTutorReply`
 * is the only function that calls the model to produce a learner-facing
 * reply; `evaluateGuardrail` and `extractMemoryUpdate` are re-exported here unchanged so
 * `tutor.controller.ts` (and any other existing caller) didn't need to
 * change a single import.
 */
export { evaluateGuardrail } from './tutor/guardrail';
export { extractMemoryUpdate } from './tutor/memory';

/** Reply sizing (see services/tutor/budget.ts). */
const MAX_REPLY_TOKENS = 1024;
/** Below this, older conversation is dropped first to make room for a useful reply. */
const MIN_REPLY_TOKENS = 300;
/** Below this, no reply is attempted; the learner gets the safe fallback instead. */
const ABS_MIN_REPLY_TOKENS = 120;
/** The solution check's own prompt besides Trak's reply: instructions plus six clipped earlier turns. */
const GUARDRAIL_BASE_TOKENS = estimateTokens('x'.repeat(GUARDRAIL_TURN_CHARS * 6 + 900));

const FALLBACK_REPLY =
  "Let's slow down for a second — can you tell me what you've tried so far, and where it's going wrong? " +
  "I want to make sure I point you in the right direction without just handing you the answer.";

const systemText = (blocks: Anthropic.TextBlockParam[]) => blocks.map((b) => b.text).join('');

/**
 * The longest reply this message can still afford: Trak's input at its worst
 * (every token a cache write), the reply itself, and the solution check that
 * reads it afterwards all have to fit in what's left of the budget.
 */
export function affordableReplyTokens(budget: MessageBudget, inputTokens: number, model: string = MODEL_REASONING): number {
  // Trak's reply uses prompt caching (cache-write rate at worst); the solution check doesn't.
  const fixed =
    worstInputRateUsd(model, true) * inputTokens + worstCaseCostUsd(MODEL_LIGHT, GUARDRAIL_BASE_TOKENS, GUARDRAIL_MAX_TOKENS);
  const perReplyToken = outputRateUsd(model) + worstInputRateUsd(MODEL_LIGHT);
  return Math.min(MAX_REPLY_TOKENS, Math.floor((budget.remaining() - fixed) / perReplyToken));
}

/** Drops the oldest turns until a useful reply fits (keeping the conversation starting with the learner). */
function fitConversation(
  budget: MessageBudget,
  systemTokens: number,
  conversation: Anthropic.MessageParam[],
  model: string
): { conversation: Anthropic.MessageParam[]; maxTokens: number } {
  let conv = conversation;
  let maxTokens = affordableReplyTokens(budget, systemTokens + estimateMessagesTokens(conv), model);
  while (maxTokens < MIN_REPLY_TOKENS && conv.length > 1) {
    conv = conv.slice(1);
    while (conv.length > 1 && conv[0].role !== 'user') conv = conv.slice(1);
    maxTokens = affordableReplyTokens(budget, systemTokens + estimateMessagesTokens(conv), model);
  }
  return { conversation: conv, maxTokens };
}

/**
 * Generates Trak's next reply for a live conversation, retrying with a
 * stricter prompt if the guardrail flags the first attempt, and falling
 * back to a safe, level-appropriate nudge if it's still flagged after
 * `MAX_GUARDRAIL_ATTEMPTS` — never surfaces a flagged reply to the learner.
 *
 * Everything runs inside `budget` (1.5¢ per message by default): each reply is
 * sized to what's left, older turns are dropped if the conversation is too long
 * to afford a useful reply, and a retry only happens if it still fits.
 *
 * @throws {AiUnavailableError} if `AI_API_KEY` isn't configured.
 */
export async function generateTutorReply(
  context: TutorContext,
  conversation: Anthropic.MessageParam[],
  opts: { isOpeningTurn: boolean; model?: string },
  budget: MessageBudget = new MessageBudget()
): Promise<{ text: string; revealed: boolean; model: string }> {
  const client = getAnthropicClient();
  if (!client) {
    throw new AiUnavailableError('AI_API_KEY is not configured — the AI tutor is unavailable');
  }

  let stricter = false;
  let model = opts.model ?? MODEL_LIGHT;
  let refusalRetried = false;

  for (let attempt = 1; attempt <= MAX_GUARDRAIL_ATTEMPTS; attempt++) {
    const promptOpts = { isOpeningTurn: opts.isOpeningTurn, stricter };
    // Size against the prompt with a length line in it (the line itself costs a few tokens).
    const systemTokens = estimateTokens(systemText(buildSystemPrompt(context, { ...promptOpts, maxWords: 9999 })));
    const fit = fitConversation(budget, systemTokens, conversation, model);
    if (fit.maxTokens < ABS_MIN_REPLY_TOKENS) break;

    const response = await client.messages.create({
      model,
      max_tokens: fit.maxTokens,
      // No extended thinking: a tutoring reply is short, and thinking tokens
      // count as output. Found live: with it on, a capped reply could spend
      // its whole allowance thinking and come back empty.
      thinking: { type: 'disabled' },
      // A short limit gets a matching instruction, so the reply ends cleanly.
      system: buildSystemPrompt(context, {
        ...promptOpts,
        maxWords: fit.maxTokens < 700 ? Math.floor(fit.maxTokens * 0.6) : undefined,
      }),
      messages: withCacheBreakpointOnLastMessage(fit.conversation),
    });
    logAiUsage({
      userId: context.userId,
      modelId: model,
      tier: model === MODEL_REASONING ? 'reasoning' : 'fast',
      purpose: 'tutor-reply',
      usage: response.usage,
    });
    budget.charge(model, response.usage);

    // Haiku 5.5's safety classifiers can decline (no server-side fallback):
    // try once more on the reasoning model, if the budget allows.
    if (response.stop_reason === 'refusal') {
      if (model !== MODEL_REASONING && !refusalRetried) {
        refusalRetried = true;
        model = MODEL_REASONING;
        attempt--;
        continue;
      }
      break;
    }

    let text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n');
    if (response.stop_reason === 'max_tokens') {
      text = `${text.trimEnd()}…\n\n_(I ran out of room there. Ask me to keep going.)_`;
    }

    const recentTurns = [...fit.conversation.slice(-6), { role: 'assistant' as const, content: text }];
    const { flagged, revealed } = await evaluateGuardrail(text, context, recentTurns, undefined, budget);
    if (!flagged) return { text, revealed, model };

    stricter = true;
  }

  // Flagged every time, or no budget left for a (re)try — never surface a
  // flagged response. Fall back to a safe nudge instead.
  return { text: FALLBACK_REPLY, revealed: false, model };
}
