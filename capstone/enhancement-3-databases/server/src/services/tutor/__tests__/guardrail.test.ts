// Contract test for the fail-closed fix (Module 2 code review, finding 7):
// a classifier outage must FLAG a plausible-leak reply, never wave it
// through. Uses real dependency injection (a fake Anthropic-shaped client
// passed straight into evaluateGuardrail) rather than jest.mock('../aiClient')
// — this is exactly what decomposing tutor.service.ts and injecting the
// client was for: no module mocking needed to isolate this function.
jest.mock('../../executionClient', () => ({ executeCode: jest.fn() }));

import Anthropic from '@anthropic-ai/sdk';
import { evaluateGuardrail } from '../guardrail';
import { TutorContext } from '../../tutorContext.service';

// A curriculumItem-context session (still calibrating, no problem attached)
// has NO sandbox guardrail layer — sandboxGuardrailFlags short-circuits to
// `false` for anything but `kind: 'problem'`. That makes it the exact case
// where a classifier outage previously left the reply with zero guardrail
// coverage at all, which is what finding 7 flagged.
const curriculumContext: TutorContext = {
  kind: 'curriculumItem',
  userId: 'test-user',
  title: 'Variables & Types',
  content: 'lesson content',
  progressSummary: '',
  memory: { goals: '', personalNotes: '', topicSkills: [], daysSinceLastInteraction: null },
  stuckSignal: { messageCount: 2, minutesSinceSessionStart: 3, hasSucceededSinceSessionStart: false },
  curriculumOutline: '',
};

// Long enough and has a code fence, so it clears the cheap pre-filter
// (implausibleSolutionLeak) and actually reaches the classifier call.
const plausibleLeak = ['Here is the full solution:', '```python', 'print("Hello, world!")', '```'].join('\n');

function fakeClient(parse: jest.Mock): Anthropic {
  return { messages: { parse } } as unknown as Anthropic;
}

describe('evaluateGuardrail — fail-closed on classifier outage', () => {
  it('flags a plausible-leak reply when the classifier call throws', async () => {
    const client = fakeClient(jest.fn().mockRejectedValue(new Error('simulated network outage')));

    const result = await evaluateGuardrail(plausibleLeak, curriculumContext, [], client);

    expect(result.flagged).toBe(true);
    expect(result.revealed).toBe(false);
  });

  it('skips the classifier entirely for a short, code-free reply (cheap pre-filter)', async () => {
    const parse = jest.fn();
    const client = fakeClient(parse);

    const result = await evaluateGuardrail('Can you tell me more about what you tried?', curriculumContext, [], client);

    expect(result.flagged).toBe(false);
    expect(parse).not.toHaveBeenCalled();
  });

  it('reveals when the classifier confirms a legitimate offer-and-consent', async () => {
    const client = fakeClient(
      jest.fn().mockResolvedValue({
        parsed_output: { rationale: 'offered and agreed', containsCompleteSolution: true, offeredAndConsented: true },
        usage: { input_tokens: 10, output_tokens: 5 },
      })
    );

    const result = await evaluateGuardrail(plausibleLeak, curriculumContext, [], client);

    expect(result.flagged).toBe(false);
    expect(result.revealed).toBe(true);
  });

  it('blocks an unconsented leak the classifier actually detects', async () => {
    const client = fakeClient(
      jest.fn().mockResolvedValue({
        parsed_output: { rationale: 'unprompted full solution', containsCompleteSolution: true, offeredAndConsented: false },
        usage: { input_tokens: 10, output_tokens: 5 },
      })
    );

    const result = await evaluateGuardrail(plausibleLeak, curriculumContext, [], client);

    expect(result.flagged).toBe(true);
    expect(result.revealed).toBe(false);
  });

  it('treats a missing client (no AI_API_KEY configured) as no solution detected', async () => {
    const result = await evaluateGuardrail(plausibleLeak, curriculumContext, [], null);

    expect(result.flagged).toBe(false);
    expect(result.revealed).toBe(false);
  });
});
