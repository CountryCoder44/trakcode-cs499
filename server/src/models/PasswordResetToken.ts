import { Schema, model, Document, Types } from 'mongoose';

// A single-use password reset link. Only a SHA-256 hash of the token is
// stored, so a database leak doesn't hand out working reset links. Mongo's TTL
// index removes expired rows on its own.

export interface IPasswordResetToken extends Document {
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
}

const passwordResetTokenSchema = new Schema<IPasswordResetToken>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  usedAt: Date,
  createdAt: { type: Date, default: Date.now },
});

passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordResetToken = model<IPasswordResetToken>('PasswordResetToken', passwordResetTokenSchema, 'passwordResetTokens');
