import { Schema, model, Document, Types } from 'mongoose';

// Spec §3.1 `users`
export type UserRole = 'user' | 'admin';
// 'none' = signed up but hasn't started a subscription (or trial) yet.
// 'trial' = in Stripe's free trial (card on file). See middleware/subscription.middleware.ts
// for which statuses get access.
export type SubscriptionStatus = 'none' | 'trial' | 'active' | 'past_due' | 'canceled' | 'demo';

// Social sign-in providers (services/oauth/providers.ts). Adding one means adding
// it here, to the enum below, and to the provider registry.
export const OAUTH_PROVIDERS = ['google', 'github', 'linkedin'] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

export interface IUserProfile {
  isPublic: boolean;
  slug?: string;
  showPortfolioLinks: boolean;
  /** Opt-in: let search engines list the public profile (it's noindex otherwise). */
  searchIndexable: boolean;
}

// One linked social login. An account can hold several (one per provider), and
// any of them signs in to the same account.
export interface IUserIdentity {
  provider: OAuthProvider;
  providerUserId: string;
  email?: string;
  linkedAt: Date;
}

export interface IUser extends Document {
  email: string;
  // Unset for accounts created through social sign-in only. Login with a
  // password against such an account fails with the same generic 401.
  passwordHash?: string;
  // Hashes of recent previous passwords (newest first), so a reset can't reuse one.
  passwordHistory?: string[];
  // True once any provider has confirmed this email. Password signups never
  // verify it, which matters for auto-linking (see accountLinking.service.ts).
  emailVerified: boolean;
  name: string;
  role: UserRole;
  createdAt: Date;

  // Subscription
  subscriptionStatus: SubscriptionStatus;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  trialEndsAt?: Date;
  // Mirrors of the Stripe subscription, kept current by the webhook, so the
  // billing page can say "renews on" / "cancels on" without calling Stripe.
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;

  // Demo access (pre-launch)

  identities: IUserIdentity[];

  // The learner's GitHub token (read:user, user:email, public_repo), saved on
  // every GitHub sign-in or connect and used for portfolio push. Encrypted at
  // rest — see utils/crypto.ts. Cleared when GitHub is disconnected.
  githubAccessToken?: string;

  // The learner's LinkedIn token (openid, profile, email, w_member_social), used
  // to share milestone posts. Encrypted at rest like the GitHub one. LinkedIn
  // tokens expire (~60 days) and self-serve apps get no refresh token, so the
  // learner reconnects once it lapses; linkedinTokenExpiresAt drives that.
  linkedinAccessToken?: string;
  linkedinTokenExpiresAt?: Date;

  // Public profile
  profile: IUserProfile;

  // UI prompts the user chose "don't show this again" on (see DISMISSIBLE_PROMPTS).
  dismissedPrompts: string[];
  // When the learner confirmed they're 18+ and accepted the Terms and Privacy
  // Policy (ticked on Billing before starting a membership), and which version.
  termsAcceptedAt?: Date;
  // "Delete my account" while a cancelled membership still has paid time left:
  // the account is deleted on this date (see accountDeletion.service.ts).
  deletionScheduledFor?: Date;
  /** Bought Trak questions left (tutoring packs). Used after the weekly allowance; never expire. */
  bonusTrakQuestions: number;
  /** Why a free trial was refused (one trial per payment card), shown on Billing. */
  trialDeniedReason?: 'card-reused';
  /** Account standing, set only by an admin after reviewing a safety incident. */
  bannedAt?: Date;
  standingReason?: string;
  /** A misuse warning the learner hasn't acknowledged yet (shown once in the app). */
  pendingWarning?: { incidentId: Types.ObjectId; issuedAt: Date; flaggedAt: Date; reason: string };
  termsVersion?: string;
}

// Keys a client may dismiss. Validated server-side so the array can't grow unbounded.
export const DISMISSIBLE_PROMPTS = ['connect-accounts'] as const;

const userProfileSchema = new Schema<IUserProfile>(
  {
    isPublic: { type: Boolean, default: false },
    slug: { type: String, unique: true, sparse: true, index: true, trim: true },
    showPortfolioLinks: { type: Boolean, default: true },
    searchIndexable: { type: Boolean, default: false },
  },
  { _id: false }
);

const userIdentitySchema = new Schema<IUserIdentity>(
  {
    provider: { type: String, enum: OAUTH_PROVIDERS, required: true },
    providerUserId: { type: String, required: true },
    email: { type: String, lowercase: true, trim: true },
    linkedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    index: true,
    lowercase: true,
    trim: true,
  },
  // select: false — never returned by default, must .select('+passwordHash') explicitly
  passwordHash: { type: String, select: false },
  passwordHistory: { type: [String], select: false, default: undefined },
  emailVerified: { type: Boolean, default: false },
  name: { type: String, required: true, trim: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now },

  subscriptionStatus: {
    type: String,
    enum: ['none', 'trial', 'active', 'past_due', 'canceled', 'demo'],
    default: 'none',
  },
  stripeCustomerId: { type: String, index: true },
  stripeSubscriptionId: String,
  trialEndsAt: Date,
  currentPeriodEnd: Date,
  cancelAtPeriodEnd: { type: Boolean, default: false },


  identities: { type: [userIdentitySchema], default: [] },

  // select: false — encrypted at rest, only ever read inside code that needs to call GitHub
  githubAccessToken: { type: String, select: false },
  linkedinAccessToken: { type: String, select: false },
  linkedinTokenExpiresAt: Date,

  profile: { type: userProfileSchema, default: () => ({}) },

  dismissedPrompts: { type: [String], default: [] },
  termsAcceptedAt: Date,
  deletionScheduledFor: { type: Date, index: { sparse: true } },
  bonusTrakQuestions: { type: Number, default: 0, min: 0 },
  trialDeniedReason: { type: String, enum: ['card-reused'] },
  bannedAt: Date,
  standingReason: String,
  pendingWarning: {
    type: { incidentId: Schema.Types.ObjectId, issuedAt: Date, flaggedAt: Date, reason: String },
    default: undefined,
    _id: false,
  },
  termsVersion: String,
});

// One provider account can belong to at most one TrakCode user. Partial so the
// many users with no identities (empty array → null keys) don't collide.
userSchema.index(
  { 'identities.provider': 1, 'identities.providerUserId': 1 },
  { unique: true, partialFilterExpression: { 'identities.provider': { $exists: true } } }
);

export const User = model<IUser>('User', userSchema, 'users');
