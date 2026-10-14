import { RequestHandler } from 'express';

// Admin routes: chain this after requireAuth. It checks the JWT's role claim is
// 'admin'. Trusts the role claim from the token rather than re-reading the DB
// on every request, the usual tradeoff for a short-lived session token.
export const requireAdminRole: RequestHandler = (req, res, next) => {
  if (req.auth?.role !== 'admin') {
    res.status(403).json({ error: 'Admin role required' });
    return;
  }
  next();
};
