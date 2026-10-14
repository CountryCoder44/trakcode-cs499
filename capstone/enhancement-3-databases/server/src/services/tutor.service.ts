import { getAnthropicClient, MODEL_REASONING } from './aiClient';
import { TutorContext } from './tutorContext.service';
import { AiUnavailableError } from '../errors/AppError';
import { MAX_GUARDRAIL_ATTEMPTS } from '../config/constants';
import { buildSystemPrompt, withCacheBreakpointOnLastMessage } from './tutor/promptBuilder';
import { evaluateGuardrail } from './tutor/guardrail';
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
 * reply; `evaluateGuardrail`, `classifyReadyForPractice`, and
 * `extractMemoryUpdate` are re-exported here unchanged so
 * `tutor.controller.ts` (and any other existing caller) didn't need to
 * change a single import.
 */
export { evaluateGuardrail } from './tutor/guardrail';
export { classifyReadyForPractice } from './tutor/classifiers';
export { extractMemoryUpdate } from './tutor/memory';

/**
 * Generates Trak's next reply for a live conversation, retrying with a
 * stricter prompt if the guardrail flags the first attempt, and falling
 * back to a safe, level-appropriate nudge if it's still flagged after
 * `MAX_GUARDRAIL_ATTEMPTS` — never surfaces a flagged reply to the learner.
 *
 * @throws {AiUnavailableError} if `AI_API_KEY` isn't configured.
 */
export async function generateTutorReply(
  context: TutorContext,
  conversation: Anthropic.MessageParam[],
  opts: { isOpeningTurn: boolean; transitioning?: boolean }
): Promise<{ text: string; revealed: boolean }> {
  const client = getAnthropicClient();
  if (!client) {
    throw new AiUnavailableError('AI_API_KEY is not configured — the AI tutor is unavailable');
  }

  let stricter = false;

  for (let attempt = 1; attempt <= MAX_GUARDRAIL_ATTEMPTS; attempt++) {
    const response = await client.messages.create({
      model: MODEL_REASONING,
      max_tokens: 1024,
      system: buildSystemPrompt(context, { isOpeningTurn: opts.isOpeningTurn, stricter, transitioning: opts.transitioning }),
      messages: withCacheBreakpointOnLastMessage(conversation),
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    const recentTurns = [...conversation.slice(-6), { role: 'assistant' as const, content: text }];
    const { flagged, revealed } = await evaluateGuardrail(text, context, recentTurns);
    if (!flagged) return { text, revealed };

    stricter = true;
  }

  // Exhausted retries — never surface a flagged response. Fall back to a
  // safe, level-appropriate nudge instead of leaking a working solution.
  return {
    text:
      "Let's slow down for a second — can you tell me what you've tried so far, and where it's going wrong? " +
      "I want to make sure I point you in the right direction without just handing you the answer.",
    revealed: false,
  };
}
