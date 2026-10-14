import { RequestHandler } from 'express';
import { z } from 'zod';
import { User } from '../models/User';
import { Submission } from '../models/Submission';
import { getActivitySummary } from '../services/activity.service';

// ---- GET /profile/:slug (public) ----
export const getPublicProfile: RequestHandler = async (req, res, next) => {
  try {
    const user = await User.findOne({ 'profile.slug': req.params.slug });
    // 404 for both "no such slug" and "exists but private" — don't leak
    // which case it is.
    if (!user || !user.profile.isPublic) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const summary = await getActivitySummary(user.id);

    let portfolioLinks: { githubRepoUrl: string; submittedAt: Date }[] = [];
    if (user.profile.showPortfolioLinks) {
      const pushed = await Submission.find({ userId: user.id, pushedToGithub: true })
        .sort({ submittedAt: -1 })
        .select('githubRepoUrl submittedAt');
      portfolioLinks = pushed.map((s) => ({ githubRepoUrl: s.githubRepoUrl!, submittedAt: s.submittedAt }));
    }

    res.json({
      name: user.name,
      slug: user.profile.slug,
      learningHeatmap: summary.learningHeatmap,
      practiceHeatmap: summary.practiceHeatmap,
      streak: summary.streak,
      totalLessonsCompleted: summary.totalLessonsCompleted,
      totalSubmissions: summary.totalSubmissions,
      portfolioLinks,
    });
  } catch (err) {
    next(err);
  }
};

// ---- PUT /profile/settings ----
const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const settingsSchema = z.object({
  isPublic: z.boolean().optional(),
  slug: z
    .string()
    .min(3)
    .max(40)
    .regex(slugPattern, 'Slug must be lowercase letters, numbers, and hyphens only')
    .optional(),
  showPortfolioLinks: z.boolean().optional(),
});

export const updateProfileSettings: RequestHandler = async (req, res, next) => {
  try {
    const body = settingsSchema.parse(req.body);
    const user = await User.findById(req.auth!.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (body.slug !== undefined) user.profile.slug = body.slug;
    if (body.isPublic !== undefined) user.profile.isPublic = body.isPublic;
    if (body.showPortfolioLinks !== undefined) user.profile.showPortfolioLinks = body.showPortfolioLinks;

    // Publishing a profile with no slug set makes it unreachable — guard it here.
    if (user.profile.isPublic && !user.profile.slug) {
      res.status(400).json({ error: 'Set a profile slug before making your profile public' });
      return;
    }

    await user.save();
    res.json({ profile: user.profile });
  } catch (err) {
    next(err);
  }
};

// ---- GET /profile/me/activity ----
export const getMyActivity: RequestHandler = async (req, res, next) => {
  try {
    const summary = await getActivitySummary(req.auth!.userId);
    res.json(summary);
  } catch (err) {
    next(err);
  }
};
