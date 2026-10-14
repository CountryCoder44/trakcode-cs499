import { Problem } from '../models/Problem';
import { Stack } from '../types/domain';

// Hand-authored sample problems for local dev/testing — distinct from the AI
// generation pipeline (§5), which is the only path allowed to mark a problem
// validated:true based on actually passing the sandbox. These are trusted
// developer-authored content, so validated:true is set directly.
interface SeedProblem {
  stack: Stack;
  topic: string;
  difficulty: 'easy';
  type: 'deep_dive';
  prompt: string;
  starterCode: string;
  testCases: { input: string; expectedOutput: string }[];
  referenceSolution: string;
  tags: string[];
}

const seedProblems: SeedProblem[] = [
  {
    stack: 'python',
    topic: 'basics',
    difficulty: 'easy',
    type: 'deep_dive',
    prompt: '# Double the Input\n\nRead a single integer `n` from stdin and print `n * 2`.',
    starterCode: 'n = int(input())\n# TODO: print double of n\n',
    testCases: [
      { input: '5', expectedOutput: '10' },
      { input: '0', expectedOutput: '0' },
      { input: '-3', expectedOutput: '-6' },
    ],
    referenceSolution: 'n = int(input())\nprint(n * 2)\n',
    tags: ['sample'],
  },
  {
    stack: 'mern',
    topic: 'strings',
    difficulty: 'easy',
    type: 'deep_dive',
    prompt: '# Reverse a String\n\nRead a line from stdin and print it reversed.',
    starterCode:
      "const line = require('fs').readFileSync(0, 'utf8').trim();\n// TODO: print the reversed string\n",
    testCases: [
      { input: 'hello', expectedOutput: 'olleh' },
      { input: 'ab', expectedOutput: 'ba' },
      { input: 'a', expectedOutput: 'a' },
    ],
    referenceSolution:
      "const line = require('fs').readFileSync(0, 'utf8').trim();\nconsole.log(line.split('').reverse().join(''));\n",
    tags: ['sample'],
  },
  {
    stack: 'cpp',
    topic: 'basics',
    difficulty: 'easy',
    type: 'deep_dive',
    prompt: '# Add Two Integers\n\nRead two space-separated integers from stdin and print their sum.',
    starterCode:
      '#include <iostream>\nint main() {\n    int a, b;\n    std::cin >> a >> b;\n    // TODO: print a + b\n    return 0;\n}\n',
    testCases: [
      { input: '2 3', expectedOutput: '5' },
      { input: '10 20', expectedOutput: '30' },
      { input: '-5 5', expectedOutput: '0' },
    ],
    referenceSolution:
      '#include <iostream>\nint main() {\n    int a, b;\n    std::cin >> a >> b;\n    std::cout << a + b << std::endl;\n    return 0;\n}\n',
    tags: ['sample'],
  },
];

export async function seedSampleProblems(): Promise<void> {
  for (const p of seedProblems) {
    await Problem.findOneAndUpdate(
      { stack: p.stack, topic: p.topic, type: p.type, 'tags': 'sample' },
      {
        ...p,
        validated: true,
        validatedAt: new Date(),
        contentHash: `seed-${p.stack}-${p.topic}-${p.type}`,
      },
      { upsert: true, new: true }
    );
  }
}
