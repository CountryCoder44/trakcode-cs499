import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { getAnthropicClient, MODEL_REASONING } from '../services/aiClient';
import { logAiUsage } from '../services/aiUsage.service';
import { AiUnavailableError } from '../errors/AppError';
import { SCOPES, advancedById, catalogFor, foundationById } from './catalog';
import { DraftGenerator, GenerationSpec, assignmentDraftSchema } from './draft';

// The real generator: one structured-output call per attempt. The prompt holds
// only the skill constraints and the schema, never a learner's history, code or
// chat, so what it produces is safe to share with every eligible learner.

export function buildGenerationPrompt(spec: GenerationSpec, feedback: string[] | null): string {
  const cat = catalogFor(spec.language);
  const scope = SCOPES[spec.scope];
  const permitted = spec.permittedFoundationIds.map((id) => foundationById(spec.language, id)!);
  const forbiddenFoundation = cat.foundation.filter((f) => !spec.permittedFoundationIds.includes(f.id));
  const required = spec.conceptIds.map((id) => advancedById(spec.language, id)!);
  const forbiddenAdvanced = cat.advanced.filter((a) => !spec.conceptIds.includes(a.id));

  const lines = [
    `Write one ${cat.label} practice assignment for TrakCode, a coding-education site. It will be stored in a shared bank and given to many learners, so keep the scenario generic: no real people, companies, credentials or personal details.`,
    '',
    `MODE: ${
      spec.mode === 'basics'
        ? 'Practice the basics. A substantial assignment that combines familiar skills. It must use ZERO concepts beyond the basics listed below.'
        : `Stretch out. The assignment must genuinely require exactly ${spec.conceptIds.length} concept(s) beyond the basics, listed below, combined into one coherent program with a useful purpose. Each one must be essential to the solution, not decoration.`
    }`,
    '',
    `SCOPE: ${scope.label}. ${scope.description} Use ${scope.requirements.min}-${scope.requirements.max} requirements` +
      (scope.minDeliverables > 1 ? ` and at least ${scope.minDeliverables} connected deliverables (tasks whose results feed each other).` : '.'),
    'The learner plans and writes the solution from a clear specification. Describe what to build, not how to build it.',
    '',
    'BASICS THE SOLUTION MAY USE (and only these):',
    ...permitted.map((f) => `- ${f.id}: ${f.name} (${f.description})`),
  ];
  if (forbiddenFoundation.length) {
    lines.push('', 'BASICS THIS LEARNER HAS NOT COVERED (the solution must not need them):', ...forbiddenFoundation.map((f) => `- ${f.id}: ${f.name} (${f.description})`));
  }
  if (required.length) {
    lines.push(
      '',
      'REQUIRED CONCEPTS BEYOND THE BASICS (all of them, and no others):',
      ...required.map((c) => `- ${c.id}: ${c.name}: ${c.description}.${c.generationNotes ? ` ${c.generationNotes}` : ''}`)
    );
  }
  lines.push(
    '',
    `CONCEPTS BEYOND THE BASICS THE SOLUTION MUST NOT USE: ${forbiddenAdvanced.map((c) => `${c.id} (${c.name})`).join('; ')}.`,
    '',
    'RUNTIME:',
    cat.runtimeNotes,
    'Any helper or mock module you provide as a fixture must be simple to call and must not require extra concepts from the learner beyond those listed.',
    '',
    'TESTS:',
    `- At least ${scope.minTests} tests, at least 1 visible and at least ${scope.minHiddenTests} hidden. Hidden tests use different data so hardcoded output can't pass.`,
    '- Every test is deterministic. Expected output must be exactly what the reference solution prints.',
    '- Together the tests cover every requirement, including edge cases.',
    '',
    'STARTER CODE: only what the learner needs to begin (essential imports, an entry point, a TODO comment). It must not implement any requirement and must not already use any required concept.',
    '',
    'METADATA: foundationConceptIds lists every basics id the reference solution relies on. advancedConceptIds is exactly the required list above.',
  );
  if (spec.brief) {
    lines.push(
      '',
      'BUILD THIS SPECIFIC ASSIGNMENT from the practice library. Keep this exact title and the scenario. Turn the requirements into a full specification within the scope above; you may add detail and edge cases, but do not change what is being built:',
      `- Title: ${spec.brief.title}`,
      `- Scenario: ${spec.brief.scenario}`,
      ...spec.brief.requirements.map((r) => `- Requirement: ${r}`)
    );
  }
  if (spec.avoidTitles.length) {
    lines.push('', 'These assignments already exist for this configuration. Make yours clearly different in scenario and requirements:', ...spec.avoidTitles.map((t) => `- ${t}`));
  }
  if (feedback?.length) {
    lines.push('', 'YOUR PREVIOUS ATTEMPT FAILED VALIDATION. Fix every one of these and return a complete new assignment:', ...feedback.map((f) => `- ${f}`));
  }
  return lines.join('\n');
}

export const anthropicGenerator: DraftGenerator = {
  async generate(spec, feedback, userId) {
    const client = getAnthropicClient();
    if (!client) throw new AiUnavailableError('AI_API_KEY is not configured, so new practice assignments cannot be generated.');
    const response = await client.messages.parse({
      model: MODEL_REASONING,
      max_tokens: 16000,
      messages: [{ role: 'user', content: buildGenerationPrompt(spec, feedback) }],
      output_config: { format: zodOutputFormat(assignmentDraftSchema) },
    });
    logAiUsage({ userId, modelId: MODEL_REASONING, tier: 'reasoning', purpose: 'practice-generation', usage: response.usage });
    const u = response.usage;
    const tokensUsed = (u.input_tokens ?? 0) + (u.output_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0);
    return { draft: response.parsed_output, tokensUsed };
  },
};
