import { buildSystemPrompt, withCacheBreakpointOnLastMessage } from '../promptBuilder';
import { TutorContext } from '../../tutorContext.service';

function baseContext(overrides: Partial<TutorContext> = {}): TutorContext {
  return {
    kind: 'problem',
    userId: 'user-1',
    title: 'Sum of Digits',
    content: 'Write a function that sums the digits of a number.',
    progressSummary: 'Has completed 3 topics.',
    memory: { goals: '', personalNotes: '', topicSkills: [], daysSinceLastInteraction: null },
    stuckSignal: { messageCount: 1, minutesSinceSessionStart: 1, hasSucceededSinceSessionStart: false },
    ...overrides,
  };
}

describe('buildSystemPrompt', () => {
  it('puts a cache_control breakpoint on the stable and semi-stable tiers only', () => {
    const blocks = buildSystemPrompt(baseContext(), { isOpeningTurn: false, stricter: false });

    expect(blocks.length).toBeGreaterThanOrEqual(2);
    expect(blocks[0].cache_control).toEqual({ type: 'ephemeral' });
    expect(blocks[1].cache_control).toEqual({ type: 'ephemeral' });
    // A volatile tail block (present here since stuckSignal always renders
    // something) must NOT carry a breakpoint — it changes every call.
    if (blocks[2]) {
      expect(blocks[2].cache_control).toBeUndefined();
    }
  });

  it('includes the problem/lesson title and content in the stable tier', () => {
    const blocks = buildSystemPrompt(baseContext({ title: 'Sum of Digits', stack: 'python' }), {
      isOpeningTurn: false,
      stricter: false,
    });
    expect(blocks[0].text).toContain('Sum of Digits');
    expect(blocks[0].text).toContain('(python)');
    expect(blocks[0].text).toContain('Write a function that sums the digits');
  });

  it('adds the capability-constraint block only for curriculumItem context, never for problem context', () => {
    const problemBlocks = buildSystemPrompt(baseContext({ kind: 'problem' }), { isOpeningTurn: false, stricter: false });
    const curriculumBlocks = buildSystemPrompt(baseContext({ kind: 'curriculumItem' }), { isOpeningTurn: false, stricter: false });

    expect(problemBlocks[0].text).not.toContain('capability constraint');
    expect(curriculumBlocks[0].text).toContain('capability constraint');
  });

  it('includes the stricter-retry instruction only when opts.stricter is true', () => {
    const normal = buildSystemPrompt(baseContext(), { isOpeningTurn: false, stricter: false });
    const stricter = buildSystemPrompt(baseContext(), { isOpeningTurn: false, stricter: true });

    const normalText = normal.map((b) => b.text).join('\n');
    const stricterText = stricter.map((b) => b.text).join('\n');
    expect(normalText).not.toContain('rejected by an automated guardrail');
    expect(stricterText).toContain('rejected by an automated guardrail');
  });

  it('surfaces live editor code with 1-based line numbers ahead of any older submission', () => {
    const blocks = buildSystemPrompt(
      baseContext({ liveEditorCode: 'x = 1\nprint(x)', latestSubmissionCode: 'y = 2', latestSubmissionResult: 'fail' }),
      { isOpeningTurn: false, stricter: false }
    );
    const text = blocks.map((b) => b.text).join('\n');
    expect(text).toContain('1| x = 1');
    expect(text).toContain('2| print(x)');
    expect(text.indexOf('1| x = 1')).toBeLessThan(text.indexOf('y = 2'));
  });
});

describe('withCacheBreakpointOnLastMessage', () => {
  it('marks only the last message with a breakpoint and never mutates the input', () => {
    const conversation = [
      { role: 'user' as const, content: 'hello' },
      { role: 'assistant' as const, content: 'hi there' },
      { role: 'user' as const, content: 'what is a variable?' },
    ];
    const original = JSON.parse(JSON.stringify(conversation));

    const result = withCacheBreakpointOnLastMessage(conversation);

    expect(conversation).toEqual(original); // input untouched
    expect(result[0]).toBe(conversation[0]);
    expect(result[1]).toBe(conversation[1]);
    expect(Array.isArray(result[2].content)).toBe(true);
    expect((result[2].content as unknown as { cache_control: unknown }[])[0].cache_control).toEqual({ type: 'ephemeral' });
  });

  it('returns the input unchanged for an empty conversation', () => {
    expect(withCacheBreakpointOnLastMessage([])).toEqual([]);
  });

  it('leaves array-content messages uncached rather than guessing', () => {
    const conversation = [{ role: 'user' as const, content: [{ type: 'text' as const, text: 'hi' }] }];
    const result = withCacheBreakpointOnLastMessage(conversation);
    expect(result).toBe(conversation);
  });
});
