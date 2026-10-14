import crypto from 'crypto';
import { Request, Response, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env, isProduction } from '../config/env';
import { OAuthProvider } from '../models/User';
import { OAuthLinkTicket } from '../models/OAuthLinkTicket';
import { AppError, OAuthError, OAuthNotConfiguredError } from '../errors/AppError';
import { signToken } from '../utils/jwt';
import { toPublicUser } from '../utils/publicUser';
import {
  PROVIDERS,
  buildAuthorizeUrl,
  configuredProviders,
  exchangeCode,
  isConfigured,
  isProvider,
  randomToken,
} from '../services/oauth/providers';
import { resolveOAuthLogin, unlinkIdentity } from '../services/oauth/accountLinking.service';
import { logIp } from '../services/ipLog.service';

// Social sign-in, step by step:
//   1. Browser navigates to GET /auth/oauth/:provider/start. We make a random
//      `state` + PKCE verifier, keep them in a short-lived signed httpOnly cookie,
//      and redirect to the provider.
//   2. Provider redirects back to GET /auth/oauth/:provider/callback?code&state.
//      We check `state` against the cookie, exchange the code, fetch the profile,
//      find/link/create the account, and redirect to the client's /auth/callback
//      with the session JWT in the URL *fragment*. A fragment never reaches any
//      server (no access logs, no Referer), unlike the old `?token=` query string.
// Both are browser navigations, so failures redirect to the client with
// #error=<message> rather than returning JSON nobody would see.

const TX_COOKIE = 'trakcode_oauth';
const TX_COOKIE_PATH = '/api/auth/oauth';
const TX_TTL_SECONDS = 10 * 60;
const LINK_TICKET_TTL_MS = 5 * 60 * 1000;

interface OAuthTx {
  purpose: 'oauth-tx';
  provider: OAuthProvider;
  state: string;
  codeVerifier: string;
  linkUserId?: string;
  returnTo?: string;
}

function frontendUrl(): string {
  return (env.FRONTEND_URL ?? 'http://localhost:5173').replace(/\/$/, '');
}

function redirectToClient(res: Response, params: Record<string, string | undefined>): void {
  const fragment = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) fragment.set(k, v);
  res.redirect(`${frontendUrl()}/auth/callback#${fragment.toString()}`);
}

function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq !== -1 && part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return undefined;
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

// Only same-app relative paths, so returnTo can't become an open redirect.
const returnToSchema = z
  .string()
  .max(300)
  .regex(/^\/(?!\/)[^\\]*$/, 'returnTo must be a path within the app')
  .optional();

function providerParam(req: Request): OAuthProvider {
  const { provider } = req.params;
  if (!isProvider(provider)) throw new OAuthError('Unknown sign-in provider', 404);
  if (!isConfigured(provider)) throw new OAuthNotConfiguredError(PROVIDERS[provider].label);
  return provider;
}

function userFacingMessage(err: unknown, provider?: OAuthProvider): string {
  if (err instanceof AppError) return err.message;
  // eslint-disable-next-line no-console
  console.error('[oauth]', err);
  const label = provider ? PROVIDERS[provider].label : 'that provider';
  return `Something went wrong signing in with ${label}. Please try again.`;
}

// ---- GET /auth/providers ----
export const listProviders: RequestHandler = (_req, res) => {
  res.json({ providers: configuredProviders().map((id) => ({ id, label: PROVIDERS[id].label })) });
};

// ---- POST /auth/oauth/:provider/link (requireAuth) ----
const linkBodySchema = z.object({ returnTo: returnToSchema });

export const createLinkTicket: RequestHandler = async (req, res, next) => {
  try {
    const provider = providerParam(req);
    const { returnTo } = linkBodySchema.parse(req.body ?? {});

    const ticket = randomToken();
    await OAuthLinkTicket.create({
      ticket,
      userId: req.auth!.userId,
      provider,
      returnTo,
      expiresAt: new Date(Date.now() + LINK_TICKET_TTL_MS),
    });

    const base = env.OAUTH_CALLBACK_BASE_URL.replace(/\/$/, '');
    res.json({ url: `${base}/${provider}/start?link=${encodeURIComponent(ticket)}` });
  } catch (err) {
    next(err);
  }
};

// ---- GET /auth/oauth/:provider/start ----
export const start: RequestHandler = async (req, res) => {
  let provider: OAuthProvider | undefined;
  try {
    provider = providerParam(req);

    let linkUserId: string | undefined;
    let returnTo: string | undefined;

    const link = typeof req.query.link === 'string' ? req.query.link : undefined;
    if (link) {
      // findOneAndDelete makes the ticket single-use.
      const ticket = await OAuthLinkTicket.findOneAndDelete({
        ticket: link,
        provider,
        expiresAt: { $gt: new Date() },
      });
      if (!ticket) throw new OAuthError('That connect link has expired. Please try again from Settings.');
      linkUserId = ticket.userId.toString();
      returnTo = ticket.returnTo;
    }

    const tx: OAuthTx = {
      purpose: 'oauth-tx',
      provider,
      state: randomToken(),
      codeVerifier: randomToken(48),
      linkUserId,
      returnTo,
    };

    res.cookie(TX_COOKIE, jwt.sign(tx, env.JWT_SECRET, { expiresIn: TX_TTL_SECONDS }), {
      httpOnly: true,
      // Lax still sends the cookie on the provider's top-level redirect back to us.
      sameSite: 'lax',
      secure: isProduction,
      path: TX_COOKIE_PATH,
      maxAge: TX_TTL_SECONDS * 1000,
    });
    res.redirect(buildAuthorizeUrl(provider, tx.state, tx.codeVerifier));
  } catch (err) {
    redirectToClient(res, { error: userFacingMessage(err, provider) });
  }
};

// ---- GET /auth/oauth/:provider/callback ----
const callbackQuerySchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
});

export const callback: RequestHandler = async (req, res) => {
  let provider: OAuthProvider | undefined;
  let returnTo: string | undefined;
  try {
    provider = providerParam(req);
    const query = callbackQuerySchema.parse(req.query);

    const rawTx = readCookie(req, TX_COOKIE);
    res.clearCookie(TX_COOKIE, { path: TX_COOKIE_PATH });

    let tx: OAuthTx | undefined;
    try {
      const decoded = rawTx ? (jwt.verify(rawTx, env.JWT_SECRET) as OAuthTx) : undefined;
      if (decoded?.purpose === 'oauth-tx') tx = decoded;
    } catch {
      tx = undefined;
    }
    returnTo = tx?.returnTo;

    if (query.error) {
      // e.g. access_denied — the user clicked Cancel on the provider's screen.
      throw new OAuthError(`${PROVIDERS[provider].label} sign-in was cancelled.`);
    }
    if (!tx || tx.provider !== provider || !query.state || !safeEqual(tx.state, query.state) || !query.code) {
      throw new OAuthError('Your sign-in session expired or was invalid. Please try again.');
    }

    const { accessToken, expiresIn } = await exchangeCode(provider, query.code, tx.codeVerifier);
    const profile = await PROVIDERS[provider].fetchProfile(accessToken);
    const { user, isNewUser } = await resolveOAuthLogin(profile, {
      linkUserId: tx.linkUserId,
      // GitHub's token carries public_repo, so keep it for portfolio push.
      githubAccessToken: provider === 'github' ? accessToken : undefined,
      // LinkedIn's token carries w_member_social, used to share milestone posts.
      linkedinToken: provider === 'linkedin' ? { accessToken, expiresIn } : undefined,
    });

    logIp(user.id, req, isNewUser ? 'signup' : 'login');
    redirectToClient(res, {
      token: signToken({ userId: user.id, role: user.role }),
      new: isNewUser ? '1' : undefined,
      linked: tx.linkUserId ? provider : undefined,
      returnTo,
    });
  } catch (err) {
    redirectToClient(res, { error: userFacingMessage(err, provider), returnTo });
  }
};

// ---- DELETE /auth/identities/:provider (requireAuth) ----
export const unlink: RequestHandler = async (req, res, next) => {
  try {
    const { provider } = req.params;
    if (!isProvider(provider)) throw new OAuthError('Unknown sign-in provider', 404);
    const user = await unlinkIdentity(req.auth!.userId, provider);
    res.json({ user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
};
