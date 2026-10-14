import Anthropic from '@anthropic-ai/sdk';
import { costOfUsage, worstCaseCostUsd } from '../aiUsage.service';
import { TRAK_MESSAGE_BUDGET_USD } from '../../config/constants';

// Per-message AI spending cap (owner decision 2026-10-12: a Trak chat message
// costs at most 1.5¢). Every AI call one learner message triggers (safety
// screening, Trak's reply and any retry, the solution check, the memory note)
// draws from one budget. Before a call, its worst case is worked out (input at
// the cache-write rate, output at its max_tokens) and the call is sized or
// skipped to fit; after it, the real cost is charged. So the total can't pass
// the cap even if every estimate comes out at its worst.

/**
 * Conservative token estimate: ~2.5 characters a token, plus overhead. Code
 * tokenizes densely, and Haiku 5.5's tokenizer counts the same text as about
 * 30% more tokens than older models.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 2.5) + 8;
}

export function estimateMessagesTokens(messages: Anthropic.MessageParam[]): number {
  return messages.reduce(
    (n, m) =>
      n +
      estimateTokens(
        typeof m.content === 'string' ? m.content : m.content.map((b) => ('text' in b ? b.text : '')).join(' '),
      ) +
      4,
    0,
  );
}

/** Trims text for a check's prompt, keeping its start and end. */
export function clip(text: string, max: number): string {
  return text.length <= max
    ? text
    : `${text.slice(0, Math.floor(max * 0.7))} [...] ${text.slice(-Math.floor(max * 0.25))}`;
}

export class MessageBudget {
  private spentUsd = 0;

  constructor(readonly limitUsd: number = TRAK_MESSAGE_BUDGET_USD) {}

  get spent(): number {
    return this.spentUsd;
  }

  /** What's left, optionally keeping some back for later steps. */
  remaining(keepUsd = 0): number {
    return this.limitUsd - this.spentUsd - keepUsd;
  }

  /** Can a call with this input and output limit run, keeping `keepUsd` back? */
  canAfford(modelId: string, inputTokens: number, maxOutputTokens: number, keepUsd = 0): boolean {
    return worstCaseCostUsd(modelId, inputTokens, maxOutputTokens) <= this.remaining(keepUsd) + 1e-12;
  }

  /** Records a finished call's real cost. */
  charge(modelId: string, usage: Parameters<typeof costOfUsage>[1]): void {
    this.spentUsd += costOfUsage(modelId, usage);
  }
}
