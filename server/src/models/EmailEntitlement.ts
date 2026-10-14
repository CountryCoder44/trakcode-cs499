import { Schema, model, Document } from 'mongoose';

// Perks that belong to an EMAIL ADDRESS rather than to one account, so they
// survive the account being deleted and recreated:
//   - founding member: 20% off for life, for anyone who first signed up while the
//     founding window was open. Fireback intends to honor this across its future
//     products too, so this record is deliberately self-contained (email +
//     dates + which product it came from) and easy to export to a shared list.
//   - free trial: offered once per email.
//
// Keyed by `emailKey`, a normalized form of the address (see
// entitlements.service.ts) so "Name+promo@gmail.com" and "name@gmail.com"
// share one record and can't collect a second trial.
export interface IEmailEntitlement extends Document {
  emailKey: string;
  email: string; // as first seen, for humans
  firstSeenAt: Date;
  sourceProduct: string;
  foundingMember: boolean;
  foundingSince?: Date;
  trialUsedAt?: Date;
  /** Banned after a safety review: no new account can be made with this address. */
  bannedAt?: Date;
  /** Last time this address agreed to the Terms + Privacy Policy at checkout, and which version. Kept after account deletion. */
  termsAcceptedAt?: Date;
  termsVersion?: string;
}

const emailEntitlementSchema = new Schema<IEmailEntitlement>({
  emailKey: { type: String, required: true, unique: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  firstSeenAt: { type: Date, required: true },
  sourceProduct: { type: String, default: 'trakcode' },
  foundingMember: { type: Boolean, default: false },
  foundingSince: Date,
  trialUsedAt: Date,
  bannedAt: Date,
  termsAcceptedAt: Date,
  termsVersion: String,
});

export const EmailEntitlement = model<IEmailEntitlement>(
  'EmailEntitlement',
  emailEntitlementSchema,
  'emailEntitlements'
);
