import jwt from 'jsonwebtoken';
import { env } from '../config/env';

// Session token — issued at signup/login, sent as `Authorization: Bearer <token>`.
export interface JwtPayload {
  userId: string;
  role: 'user' | 'admin';
}

const SESSION_EXPIRES_IN = '7d';

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: SESSION_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}
