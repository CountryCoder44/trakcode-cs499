import { z } from 'zod';
import type { PracticeLanguage, PracticeMode, PracticeScope } from './catalog';

// The shape a generator must return for one candidate assignment. Everything
// the learner sees, the private validation material, and the tutor summary.

const fileSchema = z.object({
  path: z.string().describe('Relative path in the program working directory, e.g. "orders.csv" or "mock_api.py"'),
  content: z.string(),
});

export const assignmentDraftSchema = z.object({
  title: z.string().describe('Short, specific title (under 70 characters)'),
  scenario: z.string().describe('2-4 sentences: the practical situation and why this program is useful. Generic, no real people or companies.'),
  goal: z.string().describe('One sentence: what the finished program does'),
  requirements: z.array(z.string()).describe('Concrete, numbered-style requirements, each independently checkable'),
  deliverables: z.array(z.string()).describe('What the learner hands in (e.g. "the report printed to stdout", "summary.txt"). Large assignments have 2+ connected deliverables.'),
  inputSpec: z.string().describe('Exactly what arrives on stdin and/or in which fixture files, with formats'),
  outputSpec: z.string().describe('Exactly what must be printed and/or written, with formats'),
  constraints: z.array(z.string()).describe('Limits and rules (value ranges, what may be assumed, what not to use)'),
  acceptanceCriteria: z.array(z.string()).describe('Plain statements of what counts as done'),
  samples: z.string().describe('Markdown: one worked sample input and its exact output'),
  starterCode: z.string().describe('Minimal scaffolding only: essential imports and an entry point with a TODO. No solution logic, no class/function bodies that implement requirements.'),
  fixtures: z.array(fileSchema).describe('Public files present for every test and shown read-only to the learner (sample data, a provided helper/mock module)'),
  tests: z
    .array(
      z.object({
        name: z.string().describe('What this test exercises, in a few words'),
        input: z.string().describe('Exact stdin text'),
        expectedOutput: z.string().describe('Exact expected stdout'),
        visible: z.boolean().describe('true for tests the learner can see (input and expected output); false for hidden tests'),
        files: z.array(fileSchema).default([]).describe('Extra or replacement fixture files for this test only (use to vary file data in hidden tests)'),
        expectedFiles: z.array(fileSchema).default([]).describe('Files the program must leave behind, with their exact content'),
      })
    )
    .describe('Deterministic tests; together they must cover every requirement, normal and edge cases'),
  referenceSolution: z.string().describe('Complete, idiomatic solution that passes every test. Private.'),
  foundationConceptIds: z.array(z.string()).describe('Every foundation concept id the reference solution uses'),
  advancedConceptIds: z.array(z.string()).describe('Exactly the required advanced concept ids, no others'),
  reviewCriteria: z.array(z.string()).describe('Quality points a tutor could review with the learner that tests cannot verify (naming, structure)'),
  tutorNotes: z.object({
    conceptSupport: z.array(z.object({ conceptId: z.string(), notes: z.string() })).describe('Per concept: where it fits in this assignment and what learners usually need help with'),
    pitfalls: z.array(z.string()),
    requirementBreakdown: z.array(z.string()).describe('A suggested order of small steps to build the program'),
  }),
});

export type AssignmentDraft = z.infer<typeof assignmentDraftSchema>;

/** What generation is asked to produce, after concepts have been chosen. */
export interface GenerationSpec {
  language: PracticeLanguage;
  mode: PracticeMode;
  scope: PracticeScope;
  /** The exact advanced concepts this assignment must require (empty in basics mode). */
  conceptIds: string[];
  permittedFoundationIds: string[];
  /** Titles already in the bank for this configuration, to steer away from repeats. */
  avoidTitles: string[];
  /** A practice library brief to build (title, scenario, requirements), when starting a library entry. */
  brief?: { title: string; scenario: string; requirements: string[] };
}

export interface GeneratorOutput {
  draft: unknown;
  tokensUsed: number;
}

/** Produces one candidate draft. `feedback` lists the previous attempt's validation failures. */
export interface DraftGenerator {
  generate(spec: GenerationSpec, feedback: string[] | null, userId?: string): Promise<GeneratorOutput>;
}
