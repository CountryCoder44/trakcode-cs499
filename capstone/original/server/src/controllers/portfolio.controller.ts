import { NextFunction, RequestHandler, Response } from 'express';
import { z } from 'zod';
import { Submission } from '../models/Submission';
import { Problem } from '../models/Problem';
import { User } from '../models/User';
import { pushSubmissionToGithub } from '../services/githubPortfolio.service';

// ---- POST /portfolio/push ----
const pushSchema = z.object({ submissionId: z.string().min(1) });

export const pushToPortfolio: RequestHandler = async (req, res, next) => {
  try {
    const { submissionId } = pushSchema.parse(req.body);
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

    const repoUrl = await pushSubmissionToGithub(user, submission, problem);

    submission.pushedToGithub = true;
    submission.githubRepoUrl = repoUrl;
    await submission.save();

    res.status(201).json({ githubRepoUrl: repoUrl });
  } catch (err) {
    handlePortfolioError(err, res, next);
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
        language: s.language,
        submittedAt: s.submittedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
};

function handlePortfolioError(err: unknown, res: Response, next: NextFunction) {
  if (err instanceof z.ZodError) {
    res.status(400).json({ error: 'Validation failed', details: err.flatten().fieldErrors });
    return;
  }
  if (err instanceof Error && err.message.includes('Link a GitHub account')) {
    res.status(400).json({ error: err.message });
    return;
  }
  if (err instanceof Error && err.message.startsWith('GitHub API')) {
    res.status(502).json({ error: err.message });
    return;
  }
  next(err);
}
