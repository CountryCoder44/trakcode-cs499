import { Request, RequestHandler } from 'express';
import { z } from 'zod';
import { User, IUser } from '../models/User';
import { hashPassword, comparePassword } from '../utils/password';
import { signToken, verifyToken } from '../utils/jwt';
import { toPublicUser } from '../utils/publicUser';
import { recordAccountEmail } from '../services/entitlements.service';
import { requestPasswordReset, resetPassword } from '../services/passwordReset.service';
import { logIp } from '../services/ipLog.service';
import { isEmailBanned } from '../services/safety.service';

function getBearerAuth(req: Request) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) return undefined;
  try {
    return verifyToken(token);
  } catch {
    return undefined;
  }
}

// ---- POST /auth/signup ----
const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1),
});

export const signup: RequestHandler = async (req, res, next) => {
  try {
    const { email, password, name } = signupSchema.parse(req.body);

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      res.status(409).json({ error: 'An account with that email already exists' });
      return;
    }

    if (await isEmailBanned(email)) {
      res.status(403).json({ error: "An account can't be created with this email address.", details: { code: 'ACCOUNT_BANNED' } });
      return;
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({
      email,
      passwordHash,
      name,
      subscriptionStatus: 'none',
    });
    await recordAccountEmail(user.email, user.createdAt);

    logIp(user.id, req, 'signup');
    const token = signToken({ userId: user.id, role: user.role });
    res.status(201).json({ token, user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
};

// ---- POST /auth/login ----
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const login: RequestHandler = async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    // Social-only accounts have no password; they get the same generic 401.
    if (!user || !user.passwordHash || !(await comparePassword(password, user.passwordHash))) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    logIp(user.id, req, 'login');
    const token = signToken({ userId: user.id, role: user.role });
    res.json({ token, user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
};

// ---- GET /auth/me ----
export const me: RequestHandler = async (req, res, next) => {
  try {
    const user = await User.findById(req.auth?.userId).select('+passwordHash +githubAccessToken');
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
};

// ---- POST /auth/password/forgot ----
// Always the same answer, whether or not the address has an account.
const forgotSchema = z.object({ email: z.string().email() });

export const forgotPassword: RequestHandler = async (req, res, next) => {
  try {
    const { email } = forgotSchema.parse(req.body);
    await requestPasswordReset(email);
    res.json({ message: "If that email has a TrakCode account, we've sent a link to reset the password." });
  } catch (err) {
    next(err);
  }
};

// ---- POST /auth/password/reset ----
// Sets the new password and signs the learner in.
const resetSchema = z.object({
  token: z.string().min(20).max(200),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const resetPasswordWithToken: RequestHandler = async (req, res, next) => {
  try {
    const { token, password } = resetSchema.parse(req.body);
    const user = await resetPassword(token, password);
    res.json({ token: signToken({ userId: user.id, role: user.role }), user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
};

