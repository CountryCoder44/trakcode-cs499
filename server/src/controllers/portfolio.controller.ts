import { RequestHandler } from 'express';
import { z } from 'zod';
import { Submission } from '../models/Submission';
import { Problem } from '../models/Problem';
import { User } from '../models/User';
import { DEFAULT_PORTFOLIO_REPO, REPO_NAME_PATTERN, pushSubmissionToGithub } from '../services/githubPortfolio.service';

// ---- POST /portfolio/push ----
// `destination: 'default'` adds the solution as a folder in the learner's shared
// `trakcode-solutions` repo; `'new'` creates a separate repo named `newRepoName`.
const pushSchema = z
  .object({
    submissionId: z.string().min(1),
    title: z.string().trim().min(1, 'Give this push a name').max(80),
    destination: z.enum(['default', 'new']).default('default'),
    newRepoName: z.string().trim().regex(REPO_NAME_PATTERN, 'Repo names can only use letters, numbers, "-", "_" and "."').optional(),
  })
  .refine((b) => b.destination !== 'new' || Boolean(b.newRepoName), {
    message: 'Name the new repo',
    path: ['newRepoName'],
  });

export const pushToPortfolio: RequestHandler = async (req, res, next) => {
  try {
    const { submissionId, title, destination, newRepoName } = pushSchema.parse(req.body);
    const userId = req.auth!.userId;

    const submission = await Submission.findOne({ _id: submissionId, userId });
    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }
    // Screen 7: "On pass: 'Push to GitHub' CTA appears for deep-dive problems."
    if (submission.result !== 'pass') {
      res.status(400).json({ error: 'Only passing submissions can be pushed to your portfolio' });
      return;
    }
    if (submission.pushedToGithub) {
      res.status(409).json({ error: 'This submission has already been pushed', githubRepoUrl: submission.githubRepoUrl });
      return;
    }

    const problem = await Problem.findById(submission.problemId);
    if (!problem) {
      res.status(404).json({ error: 'Problem for this submission no longer exists' });
      return;
    }

    const user = await User.findById(userId).select('+githubAccessToken');
    if (!user) {
      res.status(401).json({ error: 'Invalid session' });
      return;
    }

    const result = await pushSubmissionToGithub(user, submission, problem, { title, destination, newRepoName });

    submission.pushedToGithub = true;
    submission.githubRepoUrl = result.url;
    submission.githubTitle = title;
    submission.githubCommitUrl = result.commitUrl;
    await submission.save();

    res.status(201).json({
      githubRepoUrl: result.url,
      repoName: result.repoName,
      repoUrl: result.repoUrl,
      commitUrl: result.commitUrl,
      defaultRepoName: DEFAULT_PORTFOLIO_REPO,
    });
  } catch (err) {
    next(err);
  }
};

// ---- GET /portfolio ----
export const listPortfolio: RequestHandler = async (req, res, next) => {
  try {
    const submissions = await Submission.find({ userId: req.auth!.userId, pushedToGithub: true })
      .sort({ submittedAt: -1 })
      .populate('problemId', 'topic difficulty type stack');

    res.json({
      portfolio: submissions.map((s) => ({
        submissionId: s.id,
        problem: s.problemId,
        githubRepoUrl: s.githubRepoUrl,
        title: s.githubTitle ?? null,
        language: s.language,
        submittedAt: s.submittedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
};

