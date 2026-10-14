import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { getAnthropicClient, MODEL_FAST } from '../aiClient';
import { TutorContext } from '../tutorContext.service';
import { logAiUsage } from '../aiUsage.service';
import { renderTranscript } from './shared';

const readinessClassificationSchema = z.object({
  // Rationale first, same inline-chain-of-thought pattern as the guardrail classifier.
  rationale: z.string().max(300).describe('One sentence: what in the learner\'s reply indicates readiness or not.'),
  learnerReadyToStart: z
    .boolean()
    .describe(
      'true only if the learner has clearly indicated they want to move on / get started / begin the question — ' +
        'not merely that they asked a question or made a comment. false whenever there is any remaining question or ' +
        'ambiguity about whether they want to proceed now.'
    ),
});

/**
 * Only invoked by the controller when contextType==='curriculumItem' and the
 * learner has no problem currently attached (i.e. every round's calibration,
 * not just the first). Fail-open to `false` — a classifier hiccup should
 * just mean "ask again next turn," never force an unwanted transition.
 *
 * `client` is injected, same DI pattern as `guardrail.ts` — pass a fake
 * client in tests instead of mocking `aiClient.ts`.
 */
export async function classifyReadyForPractice(
  context: TutorContext,
  conversation: Anthropic.MessageParam[],
  client: Anthropic | null = getAnthropicClient()
): Promise<boolean> {
  if (!client) return false;

  const prompt = [
    `A tutor named Trak just gave a learner a brief intro/check-in about "${context.title}" and asked whether they're ready to start the next question or have more to discuss. Here is the recent conversation, ending with the learner's newest reply:`,
    '---',
    renderTranscript(conversation.slice(-6)),
    '---',
    "Is the learner's final reply above a clear signal they want to proceed to the question now?",
  ].join('\n');

  try {
    const response = await client.messages.parse({
      model: MODEL_FAST,
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
      output_config: { format: zodOutputFormat(readinessClassificationSchema) },
    });
    logAiUsage({ userId: context.userId, modelId: MODEL_FAST, tier: 'fast', purpose: 'tutor-readiness', usage: response.usage });
    return response.parsed_output?.learnerReadyToStart ?? false;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('tutor readiness classification failed, defaulting to not-ready', err);
    return false;
  }
}
