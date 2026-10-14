import { RequestHandler } from 'express';
import { z } from 'zod';
import { runPython } from '../runners/python.runner';
import { runJavaScript } from '../runners/javascript.runner';
import { runCpp } from '../runners/cpp.runner';
import { Runner } from '../runners/types';

const MAX_CODE_LENGTH = 20_000;
const MAX_TIMEOUT_MS = 20_000;

const requestSchema = z.object({
  language: z.enum(['python', 'javascript', 'cpp']),
  code: z.string().min(1).max(MAX_CODE_LENGTH),
  testCases: z.array(z.object({ input: z.string(), expectedOutput: z.string() })).min(1),
  timeoutMs: z.number().int().positive().max(MAX_TIMEOUT_MS).default(5000),
});

const runners: Record<'python' | 'javascript' | 'cpp', Runner> = {
  python: runPython,
  javascript: runJavaScript,
  cpp: runCpp,
};

// POST /internal/execute — spec §4 contract.
export const execute: RequestHandler = async (req, res, next) => {
  try {
    const body = requestSchema.parse(req.body);
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
