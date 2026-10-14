import crypto from 'crypto';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { getAnthropicClient, MODEL_REASONING } from './aiClient';
import { Problem, IProblem, Stack, Difficulty, ProblemType } from '../models/Problem';
import { executeCode, stackToLanguage } from './executionClient';
import { logAiUsage } from './aiUsage.service';

// Spec §5 step 3: "retry generation up to N=3 attempts with the failure reason
// fed back into the prompt. If still failing, discard and flag for manual review."
const MAX_GENERATION_ATTEMPTS = 3;

const generatedProblemSchema = z.object({
  prompt: z.string().describe('Markdown problem statement shown to the learner'),
  starterCode: z.string().describe('Starter code scaffold the learner edits — must not solve the problem'),
  testCases: z
    .array(z.object({ input: z.string(), expectedOutput: z.string() }))
    .min(1)
    .describe('Test cases run by piping "input" to the program\'s stdin and diffing trimmed stdout against "expectedOutput"'),
  referenceSolution: z.string().describe('A correct, self-contained solution that passes every test case'),
  tags: z.array(z.string()).default([]),
});

type GeneratedProblem = z.infer<typeof generatedProblemSchema>;

export interface GenerationRequest {
  stack: Stack;
  topic: string;
  difficulty: Difficulty;
  type: ProblemType;
  // Only set by curriculumPractice.service.ts's attachNextProblem (via
  // problemBank.service.ts) — constrains generation to concepts this
  // specific learner has actually been taught, so a "basics" lesson can't
  // get served a problem requiring techniques from later lessons. Never set
  // for plain Practice Mode/Flash Card requests, which stay unconstrained.
  scopeHint?: string;
  // Threaded through purely for AI-usage logging (aiUsage.service.ts) —
  // whoever's request triggered this bank-miss generation. Optional since
  // nothing here depends on it being present.
  userId?: string;
}

function buildPrompt(req: GenerationRequest, previousFailureReason?: string): string {
  const language = stackToLanguage[req.stack];
  const lines = [
    `Generate a ${req.difficulty} ${req.type.replace('_', ' ')} coding practice problem for the ${req.stack} stack, on the topic of "${req.topic}".`,
    '',
    'Requirements:',
    '- The problem statement (markdown) must be self-contained and unambiguous.',
    '- Starter code should compile/parse but not solve the problem.',
    '- Provide at least 3 test cases exercising typical, edge, and boundary inputs. Test cases run by piping "input" to the program\'s stdin and comparing trimmed stdout to "expectedOutput".',
    '- The reference solution must actually solve the problem and pass every test case you provide, when run as real ' + language + ' code.',
    '- Keep the reference solution self-contained (no imports beyond the language\'s standard library).',
  ];

  if (req.scopeHint) {
    lines.push(
      '',
      'SCOPE CONSTRAINT — read carefully:',
      `This problem is for a learner who has been taught ONLY the ${language} concepts listed ` +
        'below, and nothing beyond them. The problem must be solvable using ONLY these concepts ' +
        '— do not require any syntax, built-in function, standard-library import, or technique ' +
        'that isn\'t explicitly covered below, even if it\'s common or "basic" in general.',
      '',
      'This includes reading input: if reading/parsing stdin is NOT among the concepts listed ' +
        'below, the reference solution must not depend on stdin content at all. In that case it ' +
        'is correct, and expected, for every test case\'s "input" to be an empty string and ' +
        '"expectedOutput" to be identical across all of them — do not call input() / cin>> / ' +
        'readline() or otherwise require the learner to read input to solve this problem.',
      '',
      'What this learner has already completed:',
      req.scopeHint
    );
  }

  if (previousFailureReason) {
    lines.push(
      '',
      'Your previous attempt failed validation against a real interpreter with this reason:',
      previousFailureReason,
      '',
      'Fix the problem so the reference solution actually passes all test cases this time.'
    );
  }

  return lines.join('\n');
}

function computeContentHash(problem: Pick<GeneratedProblem, 'prompt' | 'testCases'>): string {
  const normalized = JSON.stringify({ prompt: problem.prompt.trim(), testCases: problem.testCases });
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

async function generateOnce(req: GenerationRequest, previousFailureReason?: string): Promise<GeneratedProblem> {
  const client = getAnthropicClient();
  if (!client) {
    throw new Error('AI_API_KEY is not configured — problem generation is unavailable');
  }

  const response = await client.messages.parse({
    model: MODEL_REASONING,
    max_tokens: 8000,
    messages: [{ role: 'user', content: buildPrompt(req, previousFailureReason) }],
    output_config: { format: zodOutputFormat(generatedProblemSchema) },
  });
  logAiUsage({ userId: req.userId, modelId: MODEL_REASONING, tier: 'reasoning', purpose: 'problem-generation', usage: response.usage });

  if (!response.parsed_output) {
    throw new Error('Model response did not match the expected problem schema');
  }
  return response.parsed_output;
}

async function validateAgainstSandbox(
  req: GenerationRequest,
  generated: GeneratedProblem
): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    // Spec §5 step 2: "send the reference solution + test cases to the
    // Execution Sandbox. All test cases must pass." — real execution, not AI judgment.
    const result = await executeCode(
      stackToLanguage[req.stack],
      generated.referenceSolution,
      generated.testCases,
      8000
    );

    if (result.compileError) {
      return { ok: false, reason: `Compile error: ${result.compileError}` };
    }
    if (!result.allPassed) {
      const failed = result.results.filter((r) => !r.passed);
      const first = failed[0];
      return {
        ok: false,
        reason:
          `${failed.length}/${result.results.length} test case(s) failed. ` +
          `First failure — expected "${first.expectedOutput}", got "${first.actualOutput}".`,
      };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// Spec §5: generate → validate → retry (≤3) → store. Never returns a problem
// that hasn't actually passed the execution sandbox.
export async function generateValidatedProblem(req: GenerationRequest): Promise<IProblem> {
  let lastFailureReason: string | undefined;

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    const generated = await generateOnce(req, lastFailureReason);
    const validation = await validateAgainstSandbox(req, generated);

    if (validation.ok) {
      return Problem.create({
        stack: req.stack,
        topic: req.topic,
        difficulty: req.difficulty,
        type: req.type,
        prompt: generated.prompt,
        starterCode: generated.starterCode,
        testCases: generated.testCases,
        referenceSolution: generated.referenceSolution,
        validated: true,
        validatedAt: new Date(),
        tags: generated.tags,
        contentHash: computeContentHash(generated),
        timesServed: 0,
      });
    }

    lastFailureReason = validation.reason;
  }

  // Exhausted retries — store with validated:false so it surfaces on
  // GET /admin/problems/pending-review but is never served (see problemBank.service.ts).
  await Problem.create({
    stack: req.stack,
    topic: req.topic,
    difficulty: req.difficulty,
    type: req.type,
    prompt: `[GENERATION FAILED after ${MAX_GENERATION_ATTEMPTS} attempts] ${lastFailureReason ?? 'unknown error'}`,
    starterCode: '',
    testCases: [],
    referenceSolution: '',
    validated: false,
    tags: ['generation-failure'],
    contentHash: crypto.randomUUID(),
    timesServed: 0,
  });

  throw new Error(
    `Problem generation failed validation after ${MAX_GENERATION_ATTEMPTS} attempts and was flagged for manual review`
  );
}
