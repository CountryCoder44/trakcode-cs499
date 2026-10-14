import { RequestHandler } from 'express';
import { User, IUser } from '../models/User';
import { verifyToken } from '../utils/jwt';
import { standingOf } from '../services/safety.service';

const TRIAL_END_GRACE_MS = 2 * 60 * 60 * 1000;

/**
 * Who can use the paid parts of TrakCode (Learn, Practice, Trak, portfolio):
 *  - admins and demo accounts, always;
 *  - an active subscription;
 *  - a past-due one too, while Stripe retries the card (it emails the learner
 *    and eventually cancels, which removes access);
 *  - a trial that hasn't ended.
 * Everyone else ('none', 'canceled', an expired trial) is sent to Billing.
 */
export function hasProductAccess(
  user: Pick<IUser, 'role' | 'subscriptionStatus' | 'trialEndsAt'>,
  now: Date = new Date()
): boolean {
  if (user.role === 'admin') return true;
  switch (user.subscriptionStatus) {
    case 'demo':
    case 'active':
    case 'past_due':
      return true;
    case 'trial':
      // A short grace period past the trial's end: Stripe's "now active" (or
      // "cancelled") webhook can land a little after the trial ends, and a
      // learner shouldn't be bounced to Billing in that gap.
      return Boolean(user.trialEndsAt && user.trialEndsAt.getTime() + TRIAL_END_GRACE_MS > now.getTime());
    default:
      return false;
  }
}

/**
 * Mounted in app.ts in front of the paid route groups. It authenticates on its
 * own (each route's requireAuth still runs after it), so an anonymous request
 * still gets the normal 401 rather than a misleading 402.
 */
export const requireSubscription: RequestHandler = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    let userId: string;
    try {
      userId = verifyToken(token ?? '').userId;
    } catch {
      next(); // let the route's own requireAuth answer with 401
      return;
    }

    const user = await User.findById(userId).select('role subscriptionStatus trialEndsAt bannedAt standingReason');
    // A banned account (set by an admin after a safety review)
    // keeps its account, profile and billing pages, but none of the product.
    const standing = user ? standingOf(user) : null;
    if (standing) {
      res.status(403).json({
        error: 'This account has been closed for breaking our Terms of Service.',
        details: { code: 'ACCOUNT_BANNED' },
      });
      return;
    }
    if (user && hasProductAccess(user)) {
      next();
      return;
    }
    res.status(402).json({
      error: 'Start your free trial to keep learning with TrakCode.',
      details: { code: 'SUBSCRIPTION_REQUIRED' },
    });
  } catch (err) {
    next(err);
  }
};
