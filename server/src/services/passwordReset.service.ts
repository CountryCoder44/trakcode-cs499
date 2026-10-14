import crypto from 'crypto';
import { env } from '../config/env';
import { User, IUser } from '../models/User';
import { PasswordResetToken } from '../models/PasswordResetToken';
import { AppError } from '../errors/AppError';
import { comparePassword, hashPassword } from '../utils/password';
import { sendEmail } from './email/mailer';
import { passwordChangedEmail, passwordResetEmail } from './email/templates';

// "Forgot password": email a single-use link, then set a new password with it.
// The request step answers the same way whether or not the email has an
// account, so it can't be used to discover who has signed up.

export const RESET_LINK_MINUTES = 30;
export const MAX_RESETS_PER_HOUR = 3;
/** How many earlier passwords (besides the current one) can't be reused. */
export const PASSWORD_HISTORY_SIZE = 5;

const INVALID_LINK = 'This reset link is invalid or has expired. Request a new one.';

const hashToken = (raw: string) => crypto.createHash('sha256').update(raw).digest('hex');

function frontendBase(): string {
  return (env.FRONTEND_URL ?? 'http://localhost:5173').replace(/\/$/, '');
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (!user) return;

  // A few requests an hour is plenty for a real person, and stops someone from
  // flooding an inbox.
  const recent = await PasswordResetToken.countDocuments({ userId: user._id, createdAt: { $gte: new Date(Date.now() - 3_600_000) } });
  if (recent >= MAX_RESETS_PER_HOUR) return;

  const raw = crypto.randomBytes(32).toString('base64url');
  await PasswordResetToken.create({
    userId: user._id,
    tokenHash: hashToken(raw),
    expiresAt: new Date(Date.now() + RESET_LINK_MINUTES * 60_000),
  });
  // The token rides in the URL fragment so it never reaches server logs or
  // Referer headers when the page loads.
  const link = `${frontendBase()}/reset-password#token=${raw}`;
  try {
    await sendEmail(passwordResetEmail(user.email, user.name, link, RESET_LINK_MINUTES));
  } catch (err) {
    // The learner still gets the generic answer; the failure is for us to see.
    // eslint-disable-next-line no-console
    console.error('password reset email failed to send', err);
  }
}

/** True when `password` matches the current password or one of the recent ones. */
export async function isReusedPassword(user: IUser, password: string): Promise<boolean> {
  const hashes = [user.passwordHash, ...(user.passwordHistory ?? [])].filter((h): h is string => Boolean(h));
  for (const h of hashes) if (await comparePassword(password, h)) return true;
  return false;
}

/** Set a new password with a reset link's token. The token works once. */
export async function resetPassword(raw: string, newPassword: string): Promise<IUser> {
  const tokenHash = hashToken(raw);
  const valid = { tokenHash, usedAt: { $exists: false }, expiresAt: { $gt: new Date() } };

  // Check the link and the new password BEFORE using the link up, so choosing
  // an old password just asks for a different one instead of burning the link.
  const pending = await PasswordResetToken.findOne(valid);
  if (!pending) throw new AppError(INVALID_LINK, 400);
  const user = await User.findById(pending.userId).select('+passwordHash +passwordHistory');
  if (!user) throw new AppError(INVALID_LINK, 400);
  if (await isReusedPassword(user, newPassword)) {
    throw new AppError("You've used that password before. Please choose a new one.", 400);
  }

  // Now claim the link atomically, so two submissions can't both use it.
  const token = await PasswordResetToken.findOneAndUpdate(valid, { $set: { usedAt: new Date() } });
  if (!token) throw new AppError(INVALID_LINK, 400);

  if (user.passwordHash) {
    user.passwordHistory = [user.passwordHash, ...(user.passwordHistory ?? [])].slice(0, PASSWORD_HISTORY_SIZE);
  }
  user.passwordHash = await hashPassword(newPassword);
  // Opening a link sent to this address proves the learner controls it.
  user.emailVerified = true;
  await user.save();
  // Any other outstanding links for this account stop working.
  await PasswordResetToken.deleteMany({ userId: user._id, _id: { $ne: token._id } });

  sendEmail(passwordChangedEmail(user.email, user.name)).catch((err) => {
    // eslint-disable-next-line no-console
    console.error('password changed email failed to send', err);
  });
  return user;
}
