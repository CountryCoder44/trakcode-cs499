import { RequestHandler } from 'express';
import { z } from 'zod';
import { findOrGenerateProblem, toClientProblem } from '../services/problemBank.service';
import { Problem, Difficulty } from '../models/Problem';
import { Submission, SubmissionResult } from '../models/Submission';
import { UserProblemHistory } from '../models/UserProblemHistory';
import { TutorSession } from '../models/TutorSession';
import { executeCode, stackToLanguage } from '../services/executionClient';
import {
  scopedCourseForStack,
  resolveTopicScope,
  getCompletedTopicNumbers,
  ResolvedScope,
} from '../services/seqPracticeScope.service';

// The topic picker replaced the difficulty picker (see PracticeModeSelectPage.tsx)
// — a learner no longer chooses difficulty directly, so every topic-scoped
// request generates/matches at one fixed level. 'medium' matches this app's
// existing default for a request with no explicit difficulty (flash cards
// already default to 'easy' for the same reason — "no user choice -> a fixed,
// documented default", not a guess re-derived per request).
const DEFAULT_PRACTICE_DIFFICULTY: Difficulty = 'medium';

// ---- POST /practice/deep-dive/request ----
// Topic scoping (2026-09-04): a learner should never be served a problem that
// needs concepts Learn Mode hasn't taught them, unless they explicitly ask for
// it — see seqPracticeScope.service.ts. For a stack with a Sequential
// Curriculum course (python/typescript), the client sends `topicNumbers`: the
// topics the learner picked (their own completed topics by default, plus any
// not-yet-completed topic they explicitly "activated" in the picker — either
// way, an explicit selection). For a stack with none yet (cpp), the old
// freeform `topic` text is unscoped, same as before this existed.
const deepDiveSchema = z.object({
  stack: z.enum(['python', 'typescript', 'cpp', 'java']),
  topic: z.string().min(1).optional(),
  topicNumbers: z.array(z.number().int().positive()).optional(),
});

export const requestDeepDive: RequestHandler = async (req, res, next) => {
  try {
    const body = deepDiveSchema.parse(req.body);
    const course = await scopedCourseForStack(body.stack);

    let scope: ResolvedScope | null = null;
    if (course) {
      if (!body.topicNumbers || body.topicNumbers.length === 0) {
        res.status(400).json({ error: 'Pick at least one topic to practice.' });
        return;
      }
      scope = await resolveTopicScope(course, body.topicNumbers);
      if (!scope) {
        res.status(400).json({ error: 'None of the selected topics have any content yet.' });
        return;
      }
      // A Deep Dive is a coding exercise — if every selected topic is
      // concept-only (e.g. just Topic 1, which teaches no runnable code by
      // design), there is no way to generate a problem that both requires
      // original code AND stays within what's actually been taught. Say so
      // rather than silently generating something out of scope.
      if (!scope.hasLiveCoding) {
        res.status(400).json({
          error: "The topics you picked haven't introduced any code to write yet. Include a topic with hands-on practicals, or complete more of Learn Mode first.",
        });
        return;
      }
    }

    const problem = await findOrGenerateProblem({
      userId: req.auth!.userId,
      stack: body.stack,
      topic: scope?.topic ?? body.topic,
      difficulty: DEFAULT_PRACTICE_DIFFICULTY,
      type: 'deep_dive',
      scopeHint: scope?.scopeHint,
      requiredTopicNumber: scope?.requiredTopicNumber,
    });
    res.status(201).json({ problem: toClientProblem(problem) });
  } catch (err) {
    next(err);
  }
};

// ---- POST /practice/flash-card/request ----
const flashCardSchema = z.object({
  stack: z.enum(['python', 'typescript', 'cpp', 'java']),
  type: z.enum(['flash_bug', 'flash_fill']),
});

export const requestFlashCard: RequestHandler = async (req, res, next) => {
  try {
    const body = flashCardSchema.parse(req.body);
    const userId = req.auth!.userId;

    // Flash Card has no topic picker of its own and no way for the learner to
    // "ask for more" — auto-scope to what this learner has actually
    // completed, but fall back to unscoped (same as before this existed)
    // whenever there's nothing safe to scope to: a course-less stack, nothing
    // completed yet, or a completed set that's entirely concept-only (no
    // runnable code taught, so a Flash Bug/Fill exercise has nothing to draw
    // on) — unlike Deep Dive, there's no picker here to tell the learner to
    // go pick something else, so this silently widens rather than blocking.
    const course = await scopedCourseForStack(body.stack);
    const rawScope = course ? await resolveTopicScope(course, await getCompletedTopicNumbers(userId, course)) : null;
    const scope = rawScope?.hasLiveCoding ? rawScope : null;

    const problem = await findOrGenerateProblem({
      userId,
      stack: body.stack,
      // Spec §7's flash-card request body has no difficulty field — flash
      // cards are rapid-fire, so default to easy.
      difficulty: 'easy',
      type: body.type,
      scopeHint: scope?.scopeHint,
      requiredTopicNumber: scope?.requiredTopicNumber,
    });
    res.status(201).json({ problem: toClientProblem(problem) });
  } catch (err) {
    next(err);
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
  language: z.enum(['python', 'typescript', 'cpp', 'java']),
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
    const sandboxResult = await executeCode(body.language, body.code, problem.testCases, { timeoutMs: 5000 });

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

    if (result === 'pass') {
      await UserProblemHistory.updateOne({ userId, problemId: problem._id }, { status: 'completed' });
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
    });
  } catch (err) {
    next(err);
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
