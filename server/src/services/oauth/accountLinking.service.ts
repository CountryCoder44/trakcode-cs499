import { User, IUser, OAuthProvider } from '../../models/User';
import { OAuthError } from '../../errors/AppError';
import { encrypt } from '../../utils/crypto';
import { recordAccountEmail } from '../entitlements.service';
import { isEmailBanned } from '../safety.service';
import { OAuthProfile, PROVIDERS } from './providers';

export interface OAuthLoginResult {
  user: IUser;
  isNewUser: boolean;
}

export interface ResolveOptions {
  // Set when a signed-in user is connecting this provider from their profile:
  // attach to THIS account instead of finding/creating one.
  linkUserId?: string;
  // GitHub only: the user's access token (it carries public_repo). Stored
  // encrypted on whichever account this resolves to, for portfolio push, and
  // refreshed on every GitHub sign-in so it's always the newest grant.
  githubAccessToken?: string;
  // LinkedIn only: the token (it carries w_member_social) + its lifetime in
  // seconds, stored the same way, for posting milestones to the member's feed.
  linkedinToken?: { accessToken: string; expiresIn?: number };
}

// LinkedIn documents a 60-day member token; used when expires_in is missing.
const LINKEDIN_DEFAULT_TOKEN_SECONDS = 60 * 24 * 60 * 60;

function hasProviderToken(opts: ResolveOptions): boolean {
  return Boolean(opts.githubAccessToken || opts.linkedinToken);
}

function storeProviderTokens(user: IUser, opts: ResolveOptions): void {
  if (opts.githubAccessToken) user.githubAccessToken = encrypt(opts.githubAccessToken);
  if (opts.linkedinToken) {
    user.linkedinAccessToken = encrypt(opts.linkedinToken.accessToken);
    const seconds = opts.linkedinToken.expiresIn ?? LINKEDIN_DEFAULT_TOKEN_SECONDS;
    user.linkedinTokenExpiresAt = new Date(Date.now() + seconds * 1000);
  }
}

function identityOf(user: IUser, provider: OAuthProvider) {
  return user.identities.find((i) => i.provider === provider);
}

/**
 * Attaches `profile` to `user`, or confirms it's already attached. Refuses if the
 * user already has a DIFFERENT account from the same provider connected, since
 * then "sign in with GitHub" would be ambiguous about which GitHub account counts.
 */
function attachIdentity(user: IUser, profile: OAuthProfile): void {
  const label = PROVIDERS[profile.provider].label;
  const existing = identityOf(user, profile.provider);
  if (existing) {
    if (existing.providerUserId !== profile.providerUserId) {
      throw new OAuthError(
        `This TrakCode account is already connected to a different ${label} account. Disconnect it in Settings first.`,
        409
      );
    }
    return;
  }
  user.identities.push({
    provider: profile.provider,
    providerUserId: profile.providerUserId,
    email: profile.email ?? undefined,
    linkedAt: new Date(),
  });
}

/**
 * Turns a provider profile into a TrakCode account:
 *  1. Linking (signed-in user connecting a provider) → attach to that account.
 *  2. This provider account is already linked → sign in as its owner.
 *  3. Verified email matches an existing account → attach and sign in (auto-link).
 *  4. Verified email, no account → create one.
 *  5. No verified email → refuse; we can't safely match or create on it.
 */
export async function resolveOAuthLogin(profile: OAuthProfile, opts: ResolveOptions = {}): Promise<OAuthLoginResult> {
  const label = PROVIDERS[profile.provider].label;
  const owner = await User.findOne({
    identities: { $elemMatch: { provider: profile.provider, providerUserId: profile.providerUserId } },
  });

  // 1. Linking from an already signed-in session.
  if (opts.linkUserId) {
    if (owner && owner.id !== opts.linkUserId) {
      throw new OAuthError(`That ${label} account is already connected to a different TrakCode account.`, 409);
    }
    const user = await User.findById(opts.linkUserId);
    if (!user) throw new OAuthError('Your session has expired. Log in and try again.', 401);

    attachIdentity(user, profile);
    if (profile.emailVerified && profile.email?.toLowerCase() === user.email) user.emailVerified = true;
    storeProviderTokens(user, opts);
    await user.save();
    return { user, isNewUser: false };
  }

  // 2. Returning user.
  if (owner) {
    if (hasProviderToken(opts)) {
      storeProviderTokens(owner, opts);
      await owner.save();
    }
    return { user: owner, isNewUser: false };
  }

  // 5. Everything below matches or creates on the email, so it must be verified.
  if (!profile.email || !profile.emailVerified) {
    throw new OAuthError(
      `Your ${label} account doesn't have a verified email address. Verify it with ${label}, or sign up with email instead.`
    );
  }
  const email = profile.email.toLowerCase();

  // 3. Auto-link to an existing account with the same email.
  const byEmail = await User.findOne({ email }).select('+passwordHash');
  if (byEmail) {
    attachIdentity(byEmail, profile);
    // Pre-account-takeover guard: password signups never verify the email, so
    // anyone could have registered this address first. Now that the real owner
    // has proven it, drop that unverified password so whoever set it loses access.
    if (byEmail.passwordHash && !byEmail.emailVerified) {
      byEmail.set('passwordHash', undefined);
    }
    byEmail.emailVerified = true;
    storeProviderTokens(byEmail, opts);
    await byEmail.save();
    return { user: byEmail, isNewUser: false };
  }

  // 4. Brand-new account, unless this email belongs to a banned account.
  if (await isEmailBanned(email)) {
    throw new OAuthError("An account can't be created with this email address.");
  }
  const user = new User({
    email,
    emailVerified: true,
    name: profile.name?.trim() || email.split('@')[0],
    identities: [
      {
        provider: profile.provider,
        providerUserId: profile.providerUserId,
        email,
        linkedAt: new Date(),
      },
    ],
    subscriptionStatus: 'none',
  });
  storeProviderTokens(user, opts);
  await user.save();
  await recordAccountEmail(user.email, user.createdAt);
  return { user, isNewUser: true };
}

/**
 * Removes a provider from an account, refusing if it's the account's last way
 * to sign in. Disconnecting GitHub also drops the portfolio token.
 */
export async function unlinkIdentity(userId: string, provider: OAuthProvider): Promise<IUser> {
  const user = await User.findById(userId).select('+passwordHash +githubAccessToken');
  if (!user) throw new OAuthError('Your session has expired. Log in and try again.', 401);

  const label = PROVIDERS[provider].label;
  if (!identityOf(user, provider)) throw new OAuthError(`No ${label} account is connected.`, 404);

  const remaining = user.identities.filter((i) => i.provider !== provider);
  if (!user.passwordHash && remaining.length === 0) {
    throw new OAuthError(
      `${label} is the only way you sign in. Connect another account first, so you don't get locked out.`,
      409
    );
  }

  user.identities = remaining;
  if (provider === 'github') user.set('githubAccessToken', undefined);
  if (provider === 'linkedin') {
    user.set('linkedinAccessToken', undefined);
    user.set('linkedinTokenExpiresAt', undefined);
  }
  await user.save();
  return user;
}
