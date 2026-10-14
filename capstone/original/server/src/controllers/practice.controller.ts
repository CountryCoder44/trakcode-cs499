import { NextFunction, RequestHandler, Response } from 'express';
import { z } from 'zod';
import { findOrGenerateProblem, toClientProblem } from '../services/problemBank.service';
import { Problem } from '../models/Problem';
import { Submission, SubmissionResult } from '../models/Submission';
import { UserProblemHistory } from '../models/UserProblemHistory';
import { TutorSession } from '../models/TutorSession';
import { executeCode, stackToLanguage } from '../services/executionClient';
import { recordUnaidedPassIfApplicable } from '../services/curriculumPractice.service';

function handlePracticeError(err: unknown, res: Response, next: NextFunction) {
  if (err instanceof z.ZodError) {
    res.status(400).json({ error: 'Validation failed', details: err.flatten().fieldErrors });
    return;
  }
  if (err instanceof Error && err.message.includes('AI_API_KEY')) {
    res.status(503).json({ error: err.message });
    return;
  }
  // generateValidatedProblem genuinely exhausting its 3 retries is a real,
  // if rare, failure mode (AI generation + real sandbox validation both have
  // to succeed) — surface it as a clean 503, not a raw 500 with a server
  // stack trace. Same fix applied to tutor.controller.ts's handleTutorError,
  // which hits this same error via attachNextProblem.
  if (err instanceof Error && err.message.includes('flagged for manual review')) {
    res.status(503).json({ error: "Couldn't come up with a suitable question right now — try again in a moment." });
    return;
  }
  next(err);
}

// ---- POST /practice/deep-dive/request ----
const deepDiveSchema = z.object({
  stack: z.enum(['python', 'mern', 'cpp']),
  topic: z.string().min(1).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard', 'interview']),
});

export const requestDeepDive: RequestHandler = async (req, res, next) => {
  try {
    const body = deepDiveSchema.parse(req.body);
    const problem = await findOrGenerateProblem({
      userId: req.auth!.userId,
      stack: body.stack,
      topic: body.topic,
      difficulty: body.difficulty,
      type: 'deep_dive',
    });
    res.status(201).json({ problem: toClientProblem(problem) });
  } catch (err) {
    handlePracticeError(err, res, next);
  }
};

// ---- POST /practice/flash-card/request ----
const flashCardSchema = z.object({
  stack: z.enum(['python', 'mern', 'cpp']),
  type: z.enum(['flash_bug', 'flash_fill']),
});

export const requestFlashCard: RequestHandler = async (req, res, next) => {
  try {
    const body = flashCardSchema.parse(req.body);
    const problem = await findOrGenerateProblem({
      userId: req.auth!.userId,
      stack: body.stack,
      // Spec §7's flash-card request body has no difficulty field — flash
      // cards are rapid-fire, so default to easy.
      difficulty: 'easy',
      type: body.type,
    });
    res.status(201).json({ problem: toClientProblem(problem) });
  } catch (err) {
    handlePracticeError(err, res, next);
  }
};

// ---- GET /practice/problem/:id ----
export const getProblem: RequestHandler = async (req, res, next) => {
  try {
    const problem = await Problem.findById(req.params.id);
    if (!problem) {
      res.status(404).json({ error: 'Problem not found' });
      return;
    }
    res.json({ problem: toClientProblem(problem) });
  } catch (err) {
    next(err);
  }
};

// ---- POST /practice/submit ----
const submitSchema = z.object({
  problemId: z.string().min(1),
  code: z.string().min(1),
  language: z.enum(['python', 'javascript', 'cpp']),
});

export const submit: RequestHandler = async (req, res, next) => {
  try {
    const body = submitSchema.parse(req.body);
    const userId = req.auth!.userId;

    const problem = await Problem.findById(body.problemId);
    if (!problem) {
      res.status(404).json({ error: 'Problem not found' });
      return;
    }

    const expectedLanguage = stackToLanguage[problem.stack];
    if (body.language !== expectedLanguage) {
      res.status(400).json({
        error: `This problem expects ${expectedLanguage} code, not ${body.language}`,
      });
      return;
    }

    // §4: real execution, not AI judgment.
    const sandboxResult = await executeCode(body.language, body.code, problem.testCases, 5000);

    const result: SubmissionResult = sandboxResult.compileError
      ? 'error'
      : sandboxResult.allPassed
        ? 'pass'
        : 'fail';
    const totalTimeMs = sandboxResult.results.reduce((sum, r) => sum + r.timeMs, 0);

    // Did Trak ever reveal a working solution across this problem's own
    // dedicated tutor session? Stamped onto the submission either way — not
    // just for curriculum-linked problems, any problem's history can show it.
    const solvedWithHelp = !!(await TutorSession.exists({
      userId,
      contextType: 'problem',
      contextId: problem._id,
      revealedSolution: true,
    }));

    const submission = await Submission.create({
      userId,
      problemId: problem._id,
      code: body.code,
      language: body.language,
      result,
      testResults: sandboxResult.results.map((r) => ({
        passed: r.passed,
        actualOutput: r.actualOutput,
        expectedOutput: r.expectedOutput,
      })),
      executionTimeMs: totalTimeMs,
      solvedWithHelp,
    });

    let curriculumAdvance = null;
    if (result === 'pass') {
      // findOneAndUpdate (default: returns the PRE-update doc) so we can
      // tell whether this is genuinely the first time this problem was
      // passed — resubmitting an already-passed problem must never
      // double-count toward a lesson's unaidedPassCount.
      const priorHistory = await UserProblemHistory.findOneAndUpdate(
        { userId, problemId: problem._id },
        { status: 'completed' }
      );
      const isFirstPass = priorHistory?.status !== 'completed';

      curriculumAdvance = await recordUnaidedPassIfApplicable(userId, problem, { solvedWithHelp, isFirstPass });
    }

    res.status(201).json({
      submission: {
        id: submission.id,
        problemId: problem.id,
        result: submission.result,
        testResults: submission.testResults,
        executionTimeMs: submission.executionTimeMs,
        compileError: sandboxResult.compileError,
        stderr: sandboxResult.stderr,
        submittedAt: submission.submittedAt,
      },
      ...(curriculumAdvance ? { curriculumAdvance } : {}),
    });
  } catch (err) {
    handlePracticeError(err, res, next);
  }
};

// ---- GET /practice/history ----
export const getHistory: RequestHandler = async (req, res, next) => {
  try {
    const submissions = await Submission.find({ userId: req.auth!.userId })
      .sort({ submittedAt: -1 })
      .limit(100)
      .populate('problemId', 'stack topic difficulty type');

    res.json({
      submissions: submissions.map((s) => ({
        id: s.id,
        problem: s.problemId,
        language: s.language,
        result: s.result,
        executionTimeMs: s.executionTimeMs,
        pushedToGithub: s.pushedToGithub,
        githubRepoUrl: s.githubRepoUrl ?? null,
        submittedAt: s.submittedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
};
