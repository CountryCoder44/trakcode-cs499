import { IPracticeAssignment } from '../models/PracticeAssignment';
import { IPracticeAttempt } from '../models/PracticeAttempt';
import { IUser } from '../models/User';
import {
  PortfolioProject,
  PushOptions,
  PushResult,
  languageExtension,
  languageLabel,
  pushProjectToGithub,
  solutionFileName,
} from '../services/githubPortfolio.service';
import { SCOPES, advancedById, foundationById } from './catalog';

// GitHub export for a practice attempt: the learner's own code, the public
// fixture files it reads, and a README describing the assignment and the
// concepts practiced. Hidden tests and the reference solution are never part
// of an export.

const RUN_COMMAND: Record<string, (ext: string) => string> = {
  python: () => 'python solution.py < input.txt',
  typescript: () => 'npx tsx solution.ts < input.txt',
  cpp: () => 'g++ -std=c++17 -O2 solution.cpp -o solution && ./solution < input.txt',
  java: () => 'javac *.java && java Main < input.txt',
};

const bullets = (items: string[]) => items.map((i) => `- ${i}`).join('\n');

export function practiceReadme(title: string, a: IPracticeAssignment, attempt: IPracticeAttempt): string {
  const concepts = a.advancedConceptIds.map((id) => advancedById(a.language, id)?.name ?? id);
  const basics = a.foundationConceptIds.map((id) => foundationById(a.language, id)?.name ?? id);
  const ext = languageExtension(a.language);
  const sections = [
    `# ${title}`,
    '',
    `**Language:** ${languageLabel(a.language)} · **Size:** ${SCOPES[a.scope].label} · **Mode:** ${a.mode === 'stretch' ? 'Stretch out' : 'Practice the basics'}`,
    '',
    a.scenario,
    '',
    `**Goal:** ${a.goal}`,
    '',
    concepts.length ? `## Concepts practiced\n\n${bullets(concepts)}\n\nBuilt on: ${basics.join(', ')}.` : `## Skills practiced\n\n${bullets(basics)}`,
    '',
    `## Requirements\n\n${bullets(a.requirements)}`,
  ];
  if (a.deliverables.length) sections.push('', `## Deliverables\n\n${bullets(a.deliverables)}`);
  sections.push('', `## Input\n\n${a.inputSpec}`, '', `## Output\n\n${a.outputSpec}`);
  if (a.constraints.length) sections.push('', `## Constraints\n\n${bullets(a.constraints)}`);
  if (a.samples) sections.push('', `## Example\n\n${a.samples}`);
  sections.push(
    '',
    '## Running it',
    '',
    '```sh',
    RUN_COMMAND[a.language]?.(ext) ?? `run solution.${ext}`,
    '```',
    '',
    '---',
    attempt.status === 'completed'
      ? 'Built on [TrakCode](https://trakcode.com): passed every test, including hidden ones.'
      : 'Built on [TrakCode](https://trakcode.com).',
    ''
  );
  return sections.join('\n');
}

export async function exportAttemptToGithub(
  user: IUser,
  attempt: IPracticeAttempt,
  assignment: IPracticeAssignment,
  opts: PushOptions
): Promise<PushResult> {
  const project: PortfolioProject = {
    language: assignment.language,
    files: [
      // Java needs the file named after its public class (Main.java).
      { path: solutionFileName(assignment.language, attempt.code), content: attempt.code },
      ...assignment.fixtures.map((f) => ({ path: f.path, content: f.content })),
      { path: 'README.md', content: practiceReadme(opts.title.trim(), assignment, attempt) },
    ],
  };
  return pushProjectToGithub(user, project, opts);
}
