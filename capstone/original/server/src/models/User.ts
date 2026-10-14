import { Schema, model, Document, Types } from 'mongoose';

// Spec §3.1 `users`
export type UserRole = 'user' | 'admin';
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled' | 'demo';

export interface IUserProfile {
  isPublic: boolean;
  slug?: string;
  showPortfolioLinks: boolean;
}

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  createdAt: Date;

  // Subscription
  subscriptionStatus: SubscriptionStatus;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  trialEndsAt?: Date;

  // Demo access (pre-launch)
  demoCodeId?: Types.ObjectId;

  // GitHub
  githubId?: string;
  githubAccessToken?: string; // stored encrypted at rest — see utils/crypto.ts

  // Public profile
  profile: IUserProfile;
}

const userProfileSchema = new Schema<IUserProfile>(
  {
    isPublic: { type: Boolean, default: false },
    slug: { type: String, unique: true, sparse: true, index: true, trim: true },
    showPortfolioLinks: { type: Boolean, default: true },
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
  passwordHash: { type: String, required: true, select: false },
  name: { type: String, required: true, trim: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now },

  subscriptionStatus: {
    type: String,
    enum: ['trial', 'active', 'past_due', 'canceled', 'demo'],
    default: 'trial',
  },
  stripeCustomerId: String,
  stripeSubscriptionId: String,
  trialEndsAt: Date,

  demoCodeId: { type: Schema.Types.ObjectId, ref: 'DemoCode', default: null },

  githubId: { type: String, index: true },
  // select: false — encrypted at rest, only ever read inside code that needs to call GitHub
  githubAccessToken: { type: String, select: false },

  profile: { type: userProfileSchema, default: () => ({}) },
});

export const User = model<IUser>('User', userSchema, 'users');
