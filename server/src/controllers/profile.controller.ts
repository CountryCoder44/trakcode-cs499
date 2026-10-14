import { RequestHandler } from 'express';
import { z } from 'zod';
import { User, DISMISSIBLE_PROMPTS } from '../models/User';
import { Submission } from '../models/Submission';
import { getActivitySummary } from '../services/activity.service';
import { getUsage } from '../services/usageLimits.service';
import { cancelScheduledDeletion, deletionState, requestAccountDeletion } from '../services/accountDeletion.service';

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
      learningStreak: summary.learningStreak,
      practiceStreak: summary.practiceStreak,
      totalLessonsCompleted: summary.totalLessonsCompleted,
      totalSubmissions: summary.totalSubmissions,
      portfolioLinks,
      // The page tells search engines not to list it unless the learner opted in.
      searchIndexable: Boolean(user.profile.searchIndexable),
    });
  } catch (err) {
    next(err);
  }
};

// ---- PUT /profile/settings ----
const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const settingsSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80, 'Name must be 80 characters or fewer').optional(),
  isPublic: z.boolean().optional(),
  slug: z
    .string()
    .min(3, 'Your profile link needs at least 3 characters')
    .max(40, 'Your profile link can be at most 40 characters')
    .regex(slugPattern, 'Your profile link can only use lowercase letters, numbers and hyphens')
    .optional(),
  showPortfolioLinks: z.boolean().optional(),
  searchIndexable: z.boolean().optional(),
});

export const updateProfileSettings: RequestHandler = async (req, res, next) => {
  try {
    const body = settingsSchema.parse(req.body);
    const user = await User.findById(req.auth!.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (body.name !== undefined) user.name = body.name;
    if (body.slug !== undefined) user.profile.slug = body.slug;
    if (body.isPublic !== undefined) user.profile.isPublic = body.isPublic;
    if (body.showPortfolioLinks !== undefined) user.profile.showPortfolioLinks = body.showPortfolioLinks;
    if (body.searchIndexable !== undefined) user.profile.searchIndexable = body.searchIndexable;
    // Search listing only means anything for a public profile.
    if (!user.profile.isPublic) user.profile.searchIndexable = false;

    // Publishing a profile with no slug set makes it unreachable — guard it here.
    if (user.profile.isPublic && !user.profile.slug) {
      res.status(400).json({ error: 'Choose a profile link before making your profile public' });
      return;
    }

    await user.save();
    res.json({ name: user.name, profile: user.profile });
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

// ---- POST /profile/prompts/:key/dismiss ----
// "Don't show this again" on a UI prompt (e.g. the dashboard's connect-accounts
// banner). Stored on the account so it sticks across devices.
// ---- POST /profile/warning/ack ---- the learner read their misuse warning
export const acknowledgeWarning: RequestHandler = async (req, res, next) => {
  try {
    await User.updateOne({ _id: req.auth!.userId }, { $unset: { pendingWarning: '' } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

export const dismissPrompt: RequestHandler = async (req, res, next) => {
  try {
    const key = z.enum(DISMISSIBLE_PROMPTS).parse(req.params.key);
    await User.updateOne({ _id: req.auth!.userId }, { $addToSet: { dismissedPrompts: key } });
    res.json({ dismissed: key });
  } catch (err) {
    next(err);
  }
};

// ---- GET /profile/account/deletion ----
// What "Delete my account" would do right now (blocked / at period end / now).
export const getAccountDeletion: RequestHandler = async (req, res, next) => {
  try {
    const user = await User.findById(req.auth!.userId);
    if (!user) {
      res.status(401).json({ error: 'Invalid session' });
      return;
    }
    res.json({ state: deletionState(user) });
  } catch (err) {
    next(err);
  }
};

// ---- POST /profile/account/delete ----
const deleteAccountSchema = z.object({ confirmEmail: z.string().min(3).max(320) });

export const deleteAccount: RequestHandler = async (req, res, next) => {
  try {
    const { confirmEmail } = deleteAccountSchema.parse(req.body);
    res.json(await requestAccountDeletion(req.auth!.userId, confirmEmail));
  } catch (err) {
    next(err);
  }
};

// ---- POST /profile/account/delete/cancel ----
export const keepAccount: RequestHandler = async (req, res, next) => {
  try {
    await cancelScheduledDeletion(req.auth!.userId);
    res.json({ kept: true });
  } catch (err) {
    next(err);
  }
};

// ---- GET /profile/usage ----
// What's left of this learner's Trak and practice-question allowances
// (usageLimits.service.ts); null allowances mean unlimited (admins).
export const getMyUsage: RequestHandler = async (req, res, next) => {
  try {
    const user = await User.findById(req.auth!.userId);
    if (!user) {
      res.status(401).json({ error: 'Invalid session' });
      return;
    }
    res.json({ usage: await getUsage(user) });
  } catch (err) {
    next(err);
  }
};
