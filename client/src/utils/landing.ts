import type { User } from '../api/types';

/**
 * Where a learner lands after signing in (or reopening the site signed in):
 *  - has access (subscribed, trialing, admin, demo) → the dashboard;
 *  - never started a membership → Meet Trak, which leads on to the trial
 *    (so someone who abandoned sign-up at Billing picks up where they left off);
 *  - had one that ended → Billing, to subscribe again.
 */
export function landingPathFor(user: User): string {
  if (user.hasAccess) return '/dashboard';
  if (user.subscriptionStatus === 'none') return '/onboarding';
  return '/billing';
}
