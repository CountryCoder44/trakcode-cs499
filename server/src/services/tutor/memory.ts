import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { getAnthropicClient, MODEL_LIGHT } from '../aiClient';
import { TutorContext } from '../tutorContext.service';
import { ITopicSkill } from '../../models/TutorMemory';
import { logAiUsage } from '../aiUsage.service';
import { clip, estimateTokens, MessageBudget } from './budget';

/** Output limit for the memory note (the whole consolidated memory is rewritten). */
const MEMORY_MAX_TOKENS = 600;

const topicSkillLevelEnum = z.enum(['unfamiliar', 'learning', 'comfortable', 'strong']);

const memoryExtractionSchema = z.object({
  hasUpdate: z
    .boolean()
    .describe(
      'true only if this exchange revealed a new or changed durable fact worth remembering — a stated goal, ' +
        'volunteered personal context, or evidence of familiarity with a topic. false for most ordinary exchanges.'
    ),
  goals: z
    .string()
    .max(1500)
    .describe(
      'The full, updated, consolidated goals text. If hasUpdate is false, copy the current goals below unchanged. ' +
        'Rewrite/merge — do not append a new line each time.'
    ),
  personalNotes: z.string().max(1500).describe('Same rewrite-not-append rule, for other durable volunteered facts.'),
  topicSkills: z
    .array(
      z.object({
        topic: z
          .string()
          .max(60)
          .describe(
            'Short, general, lowercase label (e.g. "arrays", "recursion", "react hooks"). Reuse an existing label ' +
              'from the current memory below when it is the same underlying topic — do not create near-duplicate labels.'
          ),
        stack: z.enum(['python', 'typescript', 'cpp', 'java']).optional(),
        level: topicSkillLevelEnum,
        note: z.string().max(200).optional(),
      })
    )
    .max(40)
    .describe('The FULL updated list — copy forward unchanged entries, update ones this exchange touched, consolidate near-duplicates.'),
});

/**
 * Cheap pre-filter for the memory-extraction Haiku call below — token-usage
 * investigation found this firing after literally every message, including
 * plain "ok"/"thanks"-style filler that carries essentially no chance of
 * revealing anything new. Exact-match against a fixed list, NOT a length
 * cutoff — a genuinely short but informative message ("I love React") must
 * never be silently skipped just for being short. Every filler phrase here
 * is short, but not everything short is filler, so the list stays narrow
 * and literal rather than a heuristic that could over-match.
 */
const PURE_ACKNOWLEDGMENT_MESSAGES = new Set([
  'ok',
  'okay',
  'k',
  'kk',
  'yes',
  'yeah',
  'yep',
  'yup',
  'sure',
  'no',
  'nope',
  'nah',
  'cool',
  'nice',
  'great',
  'awesome',
  'sounds good',
  'got it',
  'gotcha',
  'makes sense',
  'alright',
  'right',
  'thanks',
  'thank you',
  'ty',
  'thx',
  'perfect',
  'good',
  "let's go",
  'lets go',
  'here we go',
  'ready',
  "i'm ready",
  'im ready',
  "let's do it",
  'lets do it',
]);

/** Exported for unit testing — see `__tests__/memory.test.ts`. */
export function isPureAcknowledgment(message: string): boolean {
  const normalized = message.trim().toLowerCase().replace(/[.!?]+$/g, '').trim();
  return PURE_ACKNOWLEDGMENT_MESSAGES.has(normalized);
}

/**
 * Called by the controller AFTER generateTutorReply returns its final,
 * accepted reply — never from inside the retry loop, since that would run
 * this once per guardrail attempt and could extract from a reply that never
 * actually reaches the learner. Fails open (returns null) on any error — a
 * memory-capture failure must never surface to the user or break the chat.
 *
 * `client` is injected, same DI pattern as `guardrail.ts`/`classifiers.ts`.
 */
export async function extractMemoryUpdate(
  context: TutorContext,
  learnerMessage: string,
  replyText: string,
  client: Anthropic | null = getAnthropicClient(),
  budget?: MessageBudget
): Promise<{ hasUpdate: boolean; goals: string; personalNotes: string; topicSkills: ITopicSkill[] } | null> {
  if (!client) return null;
  if (isPureAcknowledgment(learnerMessage)) return null;

  const { memory } = context;
  const prompt = [
    `The learner is working on "${context.title}"${context.stack ? ` (${context.stack})` : ''}.`,
    '',
    'Current memory of this learner:',
    `Goals: ${memory.goals || '(none yet)'}`,
    `Other context: ${memory.personalNotes || '(none yet)'}`,
    memory.topicSkills.length > 0
      ? `Topic familiarity: ${memory.topicSkills.map((t) => `${t.topic}${t.stack ? ` (${t.stack})` : ''}: ${t.level}`).join('; ')}.`
      : 'Topic familiarity: none recorded yet.',
    '',
    'The most recent exchange:',
    `Learner: ${clip(learnerMessage, 1500)}`,
    `Trak: ${clip(replyText, 1500)}`,
    '',
    'Does this exchange reveal any new or changed durable fact worth remembering? If so, produce the full updated memory (rewritten/consolidated, not appended). If not, copy the current memory forward unchanged and set hasUpdate to false.',
  ].join('\n');

  // Memory is opportunistic: if this message's budget can't cover it, skip it
  // this time (a later message will pick the fact up).
  if (budget && !budget.canAfford(MODEL_LIGHT, estimateTokens(prompt) + 400, MEMORY_MAX_TOKENS)) return null;

  try {
    const response = await client.messages.parse({
      model: MODEL_LIGHT,
      // Haiku 5.5 thinks by default and thinking counts as output; a check doesn't need it.
      thinking: { type: 'disabled' },
      max_tokens: MEMORY_MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }],
      output_config: { format: zodOutputFormat(memoryExtractionSchema) },
    });
    logAiUsage({ userId: context.userId, modelId: MODEL_LIGHT, tier: 'fast', purpose: 'tutor-memory-extraction', usage: response.usage });
    budget?.charge(MODEL_LIGHT, response.usage);
    const parsed = response.parsed_output;
    if (!parsed) return null;
    return {
      hasUpdate: parsed.hasUpdate,
      goals: parsed.goals,
      personalNotes: parsed.personalNotes,
      // Defensive cap, belt-and-suspenders alongside the schema's own .max(40).
      topicSkills: parsed.topicSkills.slice(0, 40).map((t) => ({ ...t, lastUpdated: new Date() })),
    };
  } catch {
    return null;
  }
}
