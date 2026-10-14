// The 1.5¢-per-message cap (services/tutor/budget.ts). The fake client bills
// every call at its worst: all input as cache writes at the estimated token
// count, and the full max_tokens of output. If the total still stays under the
// cap here, it stays under it for real calls (which bill less).
jest.mock('../../executionClient', () => ({ executeCode: jest.fn() }));
jest.mock('../../aiUsage.service', () => ({
  ...jest.requireActual('../../aiUsage.service'),
  logAiUsage: jest.fn(),
}));

const calls: { kind: 'reply' | 'check'; maxTokens: number; messages: number }[] = [];
let flagReplies = false;

// Trak's reply caches its prompt, so at worst every input token is a cache
// write; the checks don't cache, so their input is billed at the plain rate.
function billed(text: string, maxTokens: number, cached: boolean) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { estimateTokens } = require('../budget');
  const tokens = estimateTokens(text);
  return {
    input_tokens: cached ? 0 : tokens,
    cache_creation_input_tokens: cached ? tokens : 0,
    cache_read_input_tokens: 0,
    output_tokens: maxTokens,
  };
}

const fakeClient = {
  messages: {
    create: jest.fn(
      async (req: { max_tokens: number; system: { text: string }[]; messages: { content: unknown }[] }) => {
        const sent = req.system.map((b) => b.text).join('') + JSON.stringify(req.messages);
        calls.push({ kind: 'reply', maxTokens: req.max_tokens, messages: req.messages.length });
        return {
          // A reply with a code fence, so the solution check runs on it.
          content: [{ type: 'text', text: 'Here is the idea:\n```python\nprint(total)\n```\n' + 'x'.repeat(400) }],
          stop_reason: 'max_tokens',
          usage: billed(sent, req.max_tokens, true),
        };
      },
    ),
    parse: jest.fn(async (req: { max_tokens: number; messages: { content: string }[] }) => {
      calls.push({ kind: 'check', maxTokens: req.max_tokens, messages: 1 });
      return {
        parsed_output: {
          rationale: 'r',
          containsCompleteSolution: flagReplies,
          offeredAndConsented: false,
          flagged: false,
          categories: [],
          severity: 'none',
          hasUpdate: false,
          goals: '',
          personalNotes: '',
          topicSkills: [],
        },
        usage: billed(req.messages[0].content, req.max_tokens, false),
      };
    }),
  },
};

jest.mock('../../aiClient', () => ({
  getAnthropicClient: () => fakeClient,
  MODEL_REASONING: 'claude-sonnet-5',
  MODEL_FAST: 'claude-haiku-4-5',
  MODEL_LIGHT: 'claude-haiku-5-5',
}));

import Anthropic from '@anthropic-ai/sdk';
import { generateTutorReply } from '../../tutor.service';
import { MessageBudget } from '../budget';
import { moderateLearnerMessage } from '../moderation';
import { extractMemoryUpdate } from '../memory';
import { TutorContext } from '../../tutorContext.service';

const context = (content: string): TutorContext => ({
  kind: 'seqItem',
  userId: 'u1',
  title: 'Loops',
  content,
  progressSummary: '',
  memory: { goals: '', personalNotes: '', topicSkills: [], daysSinceLastInteraction: null },
  stuckSignal: { messageCount: 2, minutesSinceSessionStart: 3, hasSucceededSinceSessionStart: false },
  curriculumOutline: '',
});

const conversationOf = (n: number, chars: number): Anthropic.MessageParam[] =>
  Array.from({ length: n }, (_, i) => ({
    role: i % 2 === 0 ? 'user' : 'assistant',
    content: `turn ${i} ` + 'y'.repeat(chars),
  }));

let replyModel = 'claude-sonnet-5';

async function fullMessage(ctx: TutorContext, conv: Anthropic.MessageParam[]) {
  const budget = new MessageBudget();
  await moderateLearnerMessage('u1', conv, fakeClient as unknown as Anthropic, budget);
  const reply = await generateTutorReply(ctx, conv, { isOpeningTurn: false, model: replyModel }, budget);
  await extractMemoryUpdate(
    ctx,
    String(conv[conv.length - 1].content),
    reply.text,
    fakeClient as unknown as Anthropic,
    budget,
  );
  return { budget, reply };
}

beforeEach(() => {
  calls.length = 0;
  flagReplies = false;
});

describe.each(['claude-sonnet-5', 'claude-haiku-5-5'])('1.5¢ per message on %s', (model) => {
  beforeEach(() => {
    replyModel = model;
  });

  it('a normal message gets a full-length reply and stays under the cap', async () => {
    const { budget } = await fullMessage(context('A short lesson.'), conversationOf(5, 200));
    expect(budget.spent).toBeLessThanOrEqual(0.015);
    expect(calls.find((c) => c.kind === 'reply')!.maxTokens).toBeGreaterThanOrEqual(500);
  });

  it('a very long conversation is trimmed so a useful reply still fits', async () => {
    const { budget } = await fullMessage(context('A short lesson.'), conversationOf(40, 2500));
    const reply = calls.find((c) => c.kind === 'reply')!;
    // On Sonnet it has to drop older turns; on Haiku all 40 fit.
    if (model === 'claude-sonnet-5') expect(reply.messages).toBeLessThan(40);
    else expect(reply.messages).toBe(40);
    expect(reply.maxTokens).toBeGreaterThanOrEqual(300);
    expect(budget.spent).toBeLessThanOrEqual(0.015);
  });

  it('a flagged reply only retries if the retry still fits, then falls back', async () => {
    flagReplies = true;
    const { budget, reply } = await fullMessage(context('A short lesson. ' + 'z'.repeat(3000)), conversationOf(9, 600));
    expect(budget.spent).toBeLessThanOrEqual(0.015);
    expect(reply.text).toMatch(/slow down/);
  });

  it('a huge lesson context still never passes the cap', async () => {
    const { budget } = await fullMessage(context('w'.repeat(30000)), conversationOf(3, 4000));
    expect(budget.spent).toBeLessThanOrEqual(0.015);
  });

  it('a reply cut off at its limit says so', async () => {
    const { reply } = await fullMessage(context('A short lesson.'), conversationOf(3, 100));
    expect(reply.text).toMatch(/Ask me to keep going/);
  });
});
