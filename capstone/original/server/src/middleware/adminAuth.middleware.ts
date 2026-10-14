import { RequestHandler } from 'express';
import { env } from '../config/env';

// Spec §7 Admin: "POST /admin/demo-codes ... requires DEMO_CODE_ADMIN_KEY" —
// read as a shared machine credential (e.g. for scripted demo-code
// provisioning), distinct from a logged-in user's JWT. No requireAuth here.
export const requireAdminKey: RequestHandler = (req, res, next) => {
  if (!env.DEMO_CODE_ADMIN_KEY) {
    res.status(503).json({ error: 'DEMO_CODE_ADMIN_KEY is not configured on this server' });
    return;
  }
  const provided = req.headers['x-admin-key'];
  if (provided !== env.DEMO_CODE_ADMIN_KEY) {
    res.status(401).json({ error: 'Invalid admin key' });
    return;
  }
  next();
};

// The other two admin routes (§7) aren't marked public, so the blanket "all
// routes require a valid JWT" rule applies — chain this after requireAuth and
// it additionally checks the JWT's role claim is 'admin'. Trusts the role
// claim from the token rather than re-reading the DB on every request, the
// usual tradeoff for a short-lived session token.
export const requireAdminRole: RequestHandler = (req, res, next) => {
  if (req.auth?.role !== 'admin') {
    res.status(403).json({ error: 'Admin role required' });
    return;
  }
  next();
};
