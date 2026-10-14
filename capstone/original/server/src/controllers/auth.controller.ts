import crypto from 'crypto';
import { NextFunction, Request, RequestHandler, Response } from 'express';
import { z } from 'zod';
import { User, IUser } from '../models/User';
import { DemoCode } from '../models/DemoCode';
import { hashPassword, comparePassword } from '../utils/password';
import { signToken, verifyToken, signOAuthState, verifyOAuthState } from '../utils/jwt';
import { encrypt } from '../utils/crypto';
import { env } from '../config/env';

// TODO: confirm actual trial length against the PRD — not specified in the tech spec,
// 14 days used as a placeholder so signup is functional.
const TRIAL_LENGTH_DAYS = 14;

function trialEndsAt(): Date {
  return new Date(Date.now() + TRIAL_LENGTH_DAYS * 24 * 60 * 60 * 1000);
}

function randomPassword(): string {
  // Placeholder credential for accounts created without one (demo, GitHub sign-up).
  // Never surfaced to the user — login always goes through the code/OAuth flow instead.
  return crypto.randomBytes(24).toString('hex');
}

function toPublicUser(user: IUser) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    subscriptionStatus: user.subscriptionStatus,
    profile: user.profile,
    createdAt: user.createdAt,
  };
}

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

function handleAuthError(err: unknown, res: Response, next: NextFunction) {
  if (err instanceof z.ZodError) {
    res.status(400).json({ error: 'Validation failed', details: err.flatten().fieldErrors });
    return;
  }
  next(err);
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

    const passwordHash = await hashPassword(password);
    const user = await User.create({
      email,
      passwordHash,
      name,
      subscriptionStatus: 'trial',
      trialEndsAt: trialEndsAt(),
    });

    const token = signToken({ userId: user.id, role: user.role });
    res.status(201).json({ token, user: toPublicUser(user) });
  } catch (err) {
    handleAuthError(err, res, next);
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
    if (!user || !(await comparePassword(password, user.passwordHash))) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = signToken({ userId: user.id, role: user.role });
    res.json({ token, user: toPublicUser(user) });
  } catch (err) {
    handleAuthError(err, res, next);
  }
};

// ---- POST /auth/demo-code/redeem ----
const redeemSchema = z.object({ code: z.string().min(1) });

export const redeemDemoCode: RequestHandler = async (req, res, next) => {
  try {
    const { code } = redeemSchema.parse(req.body);
    const normalizedCode = code.trim().toUpperCase();

    // Atomic find-and-decrement so two simultaneous redemptions can't both succeed
    // past the last remaining use.
    const demoCode = await DemoCode.findOneAndUpdate(
      {
        code: normalizedCode,
        usesRemaining: { $gt: 0 },
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
      },
      { $inc: { usesRemaining: -1 } }
    );

    if (!demoCode) {
      res.status(400).json({ error: 'Invalid, expired, or exhausted demo code' });
      return;
    }

    // Link to the already-authenticated user if there is one, otherwise spin up a
    // fresh demo account ("creates/links demo account" per spec §7).
    const existingAuth = getBearerAuth(req);
    let user: IUser | null;

    if (existingAuth) {
      user = await User.findById(existingAuth.userId);
      if (!user) {
        res.status(401).json({ error: 'Invalid session' });
        return;
      }
      user.demoCodeId = demoCode._id;
      user.subscriptionStatus = 'demo';
      await user.save();
    } else {
      const passwordHash = await hashPassword(randomPassword());
      user = await User.create({
        email: `demo-${demoCode._id}-${Date.now()}@trakcode.demo`,
        passwordHash,
        name: demoCode.issuedTo || 'Demo User',
        subscriptionStatus: 'demo',
        demoCodeId: demoCode._id,
      });
    }

    const token = signToken({ userId: user.id, role: user.role });
    res.json({ token, user: toPublicUser(user) });
  } catch (err) {
    handleAuthError(err, res, next);
  }
};

// ---- GET /auth/me ----
export const me: RequestHandler = async (req, res, next) => {
  try {
    const user = await User.findById(req.auth?.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
};

// ---- GET /auth/github/login ----
// Companion route, not itemized in spec §7 but required to kick off the redirect
// that /auth/github/callback completes. Sending a valid Authorization header here
// links GitHub to the current account instead of creating/logging into a new one.
export const githubLogin: RequestHandler = (req, res) => {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_OAUTH_CALLBACK_URL) {
    res.status(503).json({ error: 'GitHub OAuth is not configured on this server' });
    return;
  }

  const linkAuth = getBearerAuth(req);
  const state = signOAuthState({ linkUserId: linkAuth?.userId });

  const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
  authorizeUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  authorizeUrl.searchParams.set('redirect_uri', env.GITHUB_OAUTH_CALLBACK_URL);
  authorizeUrl.searchParams.set('scope', 'repo read:user user:email');
  authorizeUrl.searchParams.set('state', state);

  res.redirect(authorizeUrl.toString());
};

// ---- GET /auth/github/callback ----
const githubCallbackQuerySchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

interface GithubTokenResponse {
  access_token?: string;
  error?: string;
}
interface GithubUserResponse {
  id: number;
  login: string;
  email: string | null;
}
interface GithubEmailResponse {
  email: string;
  primary: boolean;
}

export const githubCallback: RequestHandler = async (req, res, next) => {
  try {
    const { code, state } = githubCallbackQuerySchema.parse(req.query);
    const { linkUserId } = verifyOAuthState(state);

    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.GITHUB_OAUTH_CALLBACK_URL) {
      res.status(503).json({ error: 'GitHub OAuth is not configured on this server' });
      return;
    }

    // Exchange the authorization code for an access token.
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: env.GITHUB_OAUTH_CALLBACK_URL,
      }),
    });
    const tokenJson = (await tokenRes.json()) as GithubTokenResponse;
    if (!tokenJson.access_token) {
      throw new Error(`GitHub token exchange failed: ${tokenJson.error ?? 'unknown error'}`);
    }
    const accessToken = tokenJson.access_token;

    const ghUserRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'TrakCode'},
    });
    const ghUser = (await ghUserRes.json()) as GithubUserResponse;
    const githubId = String(ghUser.id);
    const encryptedToken = encrypt(accessToken);

    let user: IUser | null;

    if (linkUserId) {
      // Linking flow: attach GitHub identity to the already-logged-in user.
      user = await User.findById(linkUserId);
      if (!user) {
        res.status(401).json({ error: 'Invalid session for GitHub linking' });
        return;
      }
      user.githubId = githubId;
      user.githubAccessToken = encryptedToken;
      await user.save();
    } else {
      // Sign-in / sign-up flow: find an existing account by githubId, else create one.
      user = await User.findOne({ githubId });
      if (!user) {
        let email = ghUser.email;
        if (!email) {
          const emailsRes = await fetch('https://api.github.com/user/emails', {
            headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'TrakCode'},
          });
          const emails = (await emailsRes.json()) as GithubEmailResponse[];
          email = emails.find((e) => e.primary)?.email ?? emails[0]?.email ?? `${ghUser.login}@users.noreply.github.com`;
        }

        const passwordHash = await hashPassword(randomPassword());
        user = await User.create({
          email,
          passwordHash,
          name: ghUser.login,
          githubId,
          githubAccessToken: encryptedToken,
          subscriptionStatus: 'trial',
          trialEndsAt: trialEndsAt(),
        });
      } else {
        user.githubAccessToken = encryptedToken;
        await user.save();
      }
    }

    const token = signToken({ userId: user.id, role: user.role });
    const frontendUrl = env.FRONTEND_URL ?? 'http://localhost:5173';
    res.redirect(`${frontendUrl}/auth/github/success?token=${encodeURIComponent(token)}`);
  } catch (err) {
    next(err);
  }
};
