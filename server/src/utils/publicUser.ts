import { IUser } from '../models/User';
import { hasProductAccess } from '../middleware/subscription.middleware';
import { standingOf } from '../services/safety.service';

// The user shape every auth response sends to the client. `hasPassword` and
// `githubPortfolioConnected` read select:false fields, so callers that need them
// accurate must load the user with .select('+passwordHash +githubAccessToken');
// unselected, they read as false.
export function toPublicUser(user: IUser) {
  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified,
    name: user.name,
    role: user.role,
    subscriptionStatus: user.subscriptionStatus,
    // Whether the paid parts of the app are open to this user right now.
    hasAccess: hasProductAccess(user),
    profile: user.profile,
    createdAt: user.createdAt,
    identities: user.identities.map((i) => ({ provider: i.provider, email: i.email ?? null, linkedAt: i.linkedAt })),
    hasPassword: Boolean(user.passwordHash),
    githubPortfolioConnected: Boolean(user.githubAccessToken),
    // LinkedIn posting works until the token's expiry (set/cleared with the token).
    linkedinSharingConnected: Boolean(user.linkedinTokenExpiresAt && user.linkedinTokenExpiresAt > new Date()),
    linkedinSharingExpiresAt: user.linkedinTokenExpiresAt ?? null,
    dismissedPrompts: user.dismissedPrompts ?? [],
    deletionScheduledFor: user.deletionScheduledFor ?? null,
    // Banned after a safety review; null when in good standing.
    standing: standingOf(user),
    // A misuse warning to show once, until the learner acknowledges it.
    warning: user.pendingWarning
      ? { issuedAt: user.pendingWarning.issuedAt, flaggedAt: user.pendingWarning.flaggedAt, reason: user.pendingWarning.reason }
      : null,
  };
}
