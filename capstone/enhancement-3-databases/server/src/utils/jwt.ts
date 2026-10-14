import jwt from 'jsonwebtoken';
import { env } from '../config/env';

// Session token — issued at signup/login, sent as `Authorization: Bearer <token>`.
export interface JwtPayload {
  userId: string;
  role: 'user' | 'admin';
}

// Short-lived token used only to carry state through the GitHub OAuth redirect
// round-trip (see githubLogin/githubCallback in auth.controller.ts). Kept distinct
// from JwtPayload so a stray `state` value can never be replayed as a session token.
export interface OAuthStatePayload {
  linkUserId?: string;
}

const SESSION_EXPIRES_IN = '7d';
const OAUTH_STATE_EXPIRES_IN = '10m';

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: SESSION_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}

export function signOAuthState(payload: OAuthStatePayload): string {
  return jwt.sign({ ...payload, purpose: 'github-oauth-state' }, env.JWT_SECRET, {
    expiresIn: OAUTH_STATE_EXPIRES_IN,
  });
}

export function verifyOAuthState(token: string): OAuthStatePayload {
  const decoded = jwt.verify(token, env.JWT_SECRET) as OAuthStatePayload & { purpose?: string };
  if (decoded.purpose !== 'github-oauth-state') {
    throw new Error('Invalid OAuth state token');
  }
  return decoded;
}
