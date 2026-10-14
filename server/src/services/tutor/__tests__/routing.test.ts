jest.mock('../../aiClient', () => ({ MODEL_REASONING: 'claude-sonnet-5', MODEL_LIGHT: 'claude-haiku-5-5' }));

import { replyModelFor, soundsStuck } from '../routing';
import type { TutorContext } from '../../tutorContext.service';

const ctx = (signal: Partial<TutorContext['stuckSignal']> = {}, extra: Partial<TutorContext> = {}): TutorContext => ({
  kind: 'practiceAttempt',
  userId: 'u',
  title: 't',
  content: '',
  progressSummary: '',
  memory: { goals: '', personalNotes: '', topicSkills: [], daysSinceLastInteraction: null },
  stuckSignal: { messageCount: 2, minutesSinceSessionStart: 2, hasSucceededSinceSessionStart: false, ...signal },
  curriculumOutline: '',
  ...extra,
});

describe('which model answers', () => {
  it('general questions go to Haiku', () => {
    expect(replyModelFor(ctx(), 'what does range(5) give me?')).toBe('claude-haiku-5-5');
    expect(replyModelFor(ctx(), 'how do I read a file in python')).toBe('claude-haiku-5-5');
  });

  it('a learner who says they are stuck gets Sonnet', () => {
    for (const msg of [
      "I'm stuck",
      'this still doesnt work',
      "i don't get why it prints 11",
      'ugh same error again',
      'I give up',
      "I'm so confused",
      'I keep getting the wrong answer',
      'it makes no sense',
    ]) {
      expect([msg, replyModelFor(ctx(), msg)]).toEqual([msg, 'claude-sonnet-5']);
    }
  });

  it('ordinary words that only look similar stay on Haiku', () => {
    expect(soundsStuck('how does the network work?')).toBe(false);
    expect(soundsStuck('can you give me a hint about loops')).toBe(false);
  });

  it('a long session with no success yet gets Sonnet; a success resets that', () => {
    expect(replyModelFor(ctx({ messageCount: 9, minutesSinceSessionStart: 14 }), 'ok what next')).toBe(
      'claude-sonnet-5',
    );
    expect(
      replyModelFor(
        ctx({ messageCount: 9, minutesSinceSessionStart: 14, hasSucceededSinceSessionStart: true }),
        'ok what next',
      ),
    ).toBe('claude-haiku-5-5');
  });

  it('a failing run a few messages in gets Sonnet', () => {
    const failing = { latestSubmissionResult: 'Visible test "basic" failed.' };
    expect(replyModelFor(ctx({ messageCount: 4 }, failing), 'hmm')).toBe('claude-sonnet-5');
    expect(replyModelFor(ctx({ messageCount: 4 }, { latestSubmissionResult: 'Every test passed.' }), 'hmm')).toBe(
      'claude-haiku-5-5',
    );
  });
});
