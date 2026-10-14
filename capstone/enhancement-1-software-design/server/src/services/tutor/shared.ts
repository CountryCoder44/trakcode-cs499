import Anthropic from '@anthropic-ai/sdk';

/** Renders a turn array as plain "Trak: ..." / "Learner: ..." lines for a classifier prompt. */
export function renderTranscript(turns: Anthropic.MessageParam[]): string {
  return turns
    .map((m) => {
      const text = typeof m.content === 'string' ? m.content : m.content.map((b) => ('text' in b ? b.text : '')).join(' ');
      return `${m.role === 'assistant' ? 'Trak' : 'Learner'}: ${text}`;
    })
    .join('\n');
}
