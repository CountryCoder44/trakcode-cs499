import { RequestHandler } from 'express';
import { z } from 'zod';
import { User } from '../models/User';
import { AppError } from '../errors/AppError';
import {
  MAX_STRETCH_CONCEPTS,
  PRACTICE_LANGUAGES,
  HIDDEN_PRACTICE_LANGUAGES,
  advancedById,
  PRACTICE_SCOPES,
  PracticeLanguage,
  SCOPES,
  catalogFor,
} from '../practice/catalog';
import { defaultFoundationFor } from '../practice/foundation';
import {
  StartOutcome,
  abandonAttempt,
  getAttemptWithAssignment,
  listAttempts,
  pollJob,
  reopenAttempt,
  replayAttempt,
  restartAttempt,
  runAttempt,
  saveCode,
  startPractice,
  libraryForUser,
  unfinishedOutsideLibrary,
  startLibraryEntry,
} from '../practice/attempts';
import { attemptSummary, publicAssignment, publicAttempt } from '../practice/views';
import { exportAttemptToGithub } from '../practice/export';
import { DEFAULT_PORTFOLIO_REPO, REPO_NAME_PATTERN } from '../services/githubPortfolio.service';

// Practice Mode long-form assignments ("Practice the basics" / "Stretch out").
// Thin HTTP layer over practice/attempts.ts; every response goes through the
// public projections in practice/views.ts.

const languageSchema = z.enum(['python', 'typescript', 'cpp', 'java']);
const MAX_CODE = 20_000;

function serializeOutcome(outcome: StartOutcome) {
  switch (outcome.status) {
    case 'ready':
      return { status: 'ready', attempt: publicAttempt(outcome.attempt), assignment: publicAssignment(outcome.assignment) };
    case 'active_exists':
      return { status: 'active_exists', attempt: attemptSummary(outcome.attempt, outcome.assignment.title) };
    case 'previously_started':
      return {
        status: 'previously_started',
        abandonedAttemptId: outcome.abandonedAttemptId,
        assignment: { id: outcome.assignment.id, title: outcome.assignment.title, scenario: outcome.assignment.scenario },
      };
    default:
      return outcome;
  }
}

// ---- GET /practice/catalog?language= ----
export const getCatalog: RequestHandler = async (req, res, next) => {
  try {
    const language = languageSchema.parse(req.query.language ?? 'python') as PracticeLanguage;
    const cat = catalogFor(language);
    const defaults = await defaultFoundationFor(req.auth!.userId, language);
    res.json({
      languages: PRACTICE_LANGUAGES.filter((id) => req.auth!.role === 'admin' || !HIDDEN_PRACTICE_LANGUAGES.includes(id)).map(
        (id) => ({ id, label: catalogFor(id).label })
      ),
      language,
      scopes: PRACTICE_SCOPES.map((id) => ({ id, label: SCOPES[id].label, description: SCOPES[id].description, needs: cat.minFoundationForScope[id] })),
      maxConcepts: MAX_STRETCH_CONCEPTS,
      hasTrackedProgress: defaults.hasTrackedProgress,
      foundation: cat.foundation.map((f) => ({
        id: f.id,
        name: f.name,
        description: f.description,
        covered: defaults.coveredIds.includes(f.id),
        checked: defaults.foundationIds.includes(f.id),
      })),
      concepts: cat.advanced.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        requiresFoundation: c.requiresFoundation,
        requiresConcepts: c.requiresAdvanced,
        incompatibleWith: c.incompatibleWith.map((i) => i.id),
      })),
    });
  } catch (err) {
    next(err);
  }
};

// ---- POST /practice/assignments/start ----
const startSchema = z.object({
  requestId: z.string().trim().min(8).max(100),
  intent: z.enum(['auto', 'new']).default('auto'),
  language: languageSchema,
  mode: z.enum(['basics', 'stretch']),
  scope: z.enum(['small', 'medium', 'large']),
  conceptCount: z.number().int().min(0).max(MAX_STRETCH_CONCEPTS).optional(),
  conceptIds: z.array(z.string().max(60)).max(10).optional(),
  conceptText: z.string().max(300).optional(),
  foundationIds: z.array(z.string().max(60)).max(30).optional(),
});

export const startAssignment: RequestHandler = async (req, res, next) => {
  try {
    const body = startSchema.parse(req.body);
    const outcome = await startPractice(req.auth!.userId, body);
    res.status(outcome.status === 'ready' ? 201 : outcome.status === 'pending' ? 202 : 200).json(serializeOutcome(outcome));
  } catch (err) {
    next(err);
  }
};

// ---- GET /practice/library?language= ----
// The browsable practice library, with this learner's status on each entry.
export const getLibrary: RequestHandler = async (req, res, next) => {
  try {
    const language = languageSchema.parse(req.query.language ?? 'python') as PracticeLanguage;
    const [items, ownUnfinished] = await Promise.all([
      libraryForUser(req.auth!.userId, language),
      unfinishedOutsideLibrary(req.auth!.userId, language),
    ]);
    res.json({
      // Unfinished assignments started from the setup card, not the library.
      ownUnfinished: ownUnfinished.map((r) => attemptSummary(r.attempt, r.title)),
      items: items.map(({ entry, ready, status }) => ({
        id: entry.id,
        title: entry.title,
        mode: entry.mode,
        scope: entry.scope,
        concepts: entry.concepts.map((id) => ({ id, name: advancedById(language, id)?.name ?? id })),
        scenario: entry.scenario,
        requirements: entry.requirements,
        ready,
        status,
      })),
    });
  } catch (err) {
    next(err);
  }
};

// ---- POST /practice/library/:id/start ----
const libraryStartSchema = z.object({ requestId: z.string().min(8).max(100) });

export const startLibrary: RequestHandler = async (req, res, next) => {
  try {
    const { requestId } = libraryStartSchema.parse(req.body);
    const outcome = await startLibraryEntry(req.auth!.userId, String(req.params.id), requestId);
    res.status(outcome.status === 'ready' ? 201 : outcome.status === 'pending' ? 202 : 200).json(serializeOutcome(outcome));
  } catch (err) {
    next(err);
  }
};

// ---- GET /practice/jobs/:jobId ----
export const getJob: RequestHandler = async (req, res, next) => {
  try {
    const outcome = await pollJob(req.auth!.userId, String(req.params.jobId));
    res.json(serializeOutcome(outcome));
  } catch (err) {
    next(err);
  }
};

// ---- GET /practice/attempts?status=in_progress,abandoned ----
export const getAttempts: RequestHandler = async (req, res, next) => {
  try {
    const raw = String(req.query.status ?? 'in_progress,abandoned').split(',');
    const statuses = z.array(z.enum(['in_progress', 'completed', 'abandoned'])).parse(raw);
    const rows = await listAttempts(req.auth!.userId, statuses);
    res.json({ attempts: rows.map((r) => attemptSummary(r.attempt, r.title)) });
  } catch (err) {
    next(err);
  }
};

// ---- GET /practice/attempts/:id ----
export const getAttempt: RequestHandler = async (req, res, next) => {
  try {
    const { attempt, assignment } = await getAttemptWithAssignment(req.auth!.userId, String(req.params.id));
    res.json({ attempt: publicAttempt(attempt), assignment: publicAssignment(assignment) });
  } catch (err) {
    next(err);
  }
};

const codeSchema = z.object({ code: z.string().max(MAX_CODE) });

// ---- PUT /practice/attempts/:id/code ----
export const putCode: RequestHandler = async (req, res, next) => {
  try {
    const { code } = codeSchema.parse(req.body);
    const attempt = await saveCode(req.auth!.userId, String(req.params.id), code);
    res.json({ savedAt: attempt.updatedAt });
  } catch (err) {
    next(err);
  }
};

// ---- POST /practice/attempts/:id/run ----
export const postRun: RequestHandler = async (req, res, next) => {
  try {
    const { code } = codeSchema.parse(req.body);
    const attempt = await runAttempt(req.auth!.userId, String(req.params.id), code);
    res.json({ attempt: publicAttempt(attempt) });
  } catch (err) {
    next(err);
  }
};

function attemptAction(fn: (userId: string, attemptId: string) => Promise<import('../models/PracticeAttempt').IPracticeAttempt>): RequestHandler {
  return async (req, res, next) => {
    try {
      const attempt = await fn(req.auth!.userId, String(req.params.id));
      res.json({ attempt: publicAttempt(attempt) });
    } catch (err) {
      next(err);
    }
  };
}

export const postAbandon = attemptAction(abandonAttempt);
export const postReopen = attemptAction(reopenAttempt);
export const postRestart = attemptAction(restartAttempt);
export const postReplay = attemptAction(replayAttempt);

// ---- POST /practice/attempts/:id/github ----
const pushSchema = z
  .object({
    title: z.string().trim().min(1, 'Give this push a name').max(80),
    destination: z.enum(['default', 'new']).default('default'),
    newRepoName: z.string().trim().regex(REPO_NAME_PATTERN, 'Repo names can only use letters, numbers, "-", "_" and "."').optional(),
  })
  .refine((b) => b.destination !== 'new' || Boolean(b.newRepoName), { message: 'Name the new repo', path: ['newRepoName'] });

export const postGithub: RequestHandler = async (req, res, next) => {
  try {
    const body = pushSchema.parse(req.body);
    const userId = req.auth!.userId;
    const { attempt, assignment } = await getAttemptWithAssignment(userId, String(req.params.id));
    if (attempt.status !== 'completed') throw new AppError('Finish the assignment (every test and concept check passing) before pushing it to GitHub.', 400);
    const user = await User.findById(userId).select('+githubAccessToken');
    if (!user) throw new AppError('Invalid session', 401);
    const result = await exportAttemptToGithub(user, attempt, assignment, body);
    attempt.github = { url: result.url, commitUrl: result.commitUrl, repoName: result.repoName, pushedAt: new Date() };
    await attempt.save();
    res.status(201).json({ githubRepoUrl: result.url, repoName: result.repoName, repoUrl: result.repoUrl, commitUrl: result.commitUrl, defaultRepoName: DEFAULT_PORTFOLIO_REPO });
  } catch (err) {
    next(err);
  }
};
