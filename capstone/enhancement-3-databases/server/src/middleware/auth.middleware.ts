import { RequestHandler } from 'express';
import { verifyToken } from '../utils/jwt';

// Per spec §7: "All routes except those marked public require a valid JWT."
export const requireAuth: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

  if (!token) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  try {
    req.auth = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// For public routes that still want to personalize when the caller happens
// to be authenticated (e.g. GET /roadmap showing "did I vote for this").
// A missing or invalid token is not an error here — it just means anonymous.
export const optionalAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (token) {
    try {
      req.auth = verifyToken(token);
    } catch {
      // ignore — treat as anonymous
    }
  }
  next();
};
