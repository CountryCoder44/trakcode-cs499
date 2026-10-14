import { RequestHandler } from 'express';
import { z } from 'zod';
import { runPython } from '../runners/python.runner';
import { runTypeScript } from '../runners/typescript.runner';
import { runCpp } from '../runners/cpp.runner';
import { runJava } from '../runners/java.runner';
import { Runner } from '../runners/types';
import { validateFixtures } from '../utils/fixtures';

const MAX_CODE_LENGTH = 20_000;
const MAX_TIMEOUT_MS = 20_000;

const fileSchema = z.object({ path: z.string(), content: z.string() });

const requestSchema = z.object({
  language: z.enum(['python', 'typescript', 'cpp', 'java']),
  code: z.string().min(1).max(MAX_CODE_LENGTH),
  testCases: z
    .array(
      z.object({
        input: z.string(),
        expectedOutput: z.string(),
        // Extra fixtures for this case only, and files it must leave behind.
        files: z.array(fileSchema).optional(),
        expectedFiles: z.array(fileSchema).optional(),
      })
    )
    .min(1),
  timeoutMs: z.number().int().positive().max(MAX_TIMEOUT_MS).default(5000),
  // TypeScript only: gate execution behind a strict `tsc --noEmit` pass.
  // Ignored for other languages. See runners/typeCheck.ts.
  strictTypeCheck: z.boolean().optional(),
  // Fixture files written into the working directory before every case.
  files: z.array(fileSchema).optional(),
});

const runners: Record<'python' | 'typescript' | 'cpp' | 'java', Runner> = {
  python: runPython,
  typescript: runTypeScript,
  cpp: runCpp,
  java: runJava,
};

// POST /internal/execute — spec §4 contract.
export const execute: RequestHandler = async (req, res, next) => {
  try {
    const body = requestSchema.parse(req.body);
    const fixtureError = validateFixtures(body);
    if (fixtureError) {
      res.status(400).json({ error: fixtureError });
      return;
    }
    const result = await runners[body.language](body);
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.flatten().fieldErrors });
      return;
    }
    next(err);
  }
};
