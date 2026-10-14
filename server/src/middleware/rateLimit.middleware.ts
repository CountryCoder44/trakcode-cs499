import { rateLimit, ipKeyGenerator, type Options } from 'express-rate-limit';
import type { Request } from 'express';

// Request limits by IP address (and email, for login): protection against
// bots, scrapers and password guessing. Per-learner Trak and practice
// allowances are separate (services/usageLimits.service.ts).
//
// In memory, which is right for the single API process this runs as. Counts
// reset on restart. Production sits behind one proxy (Caddy), so app.ts sets
// `trust proxy` to 1 and req.ip is the visitor's real address.

const tooMany: Options['handler'] = (_req, res) => {
  res.status(429).json({
    error: 'Too many requests. Please wait a few minutes and try again.',
    details: { code: 'RATE_LIMITED' },
  });
};

// Jest runs whole suites from one address; tests that exercise these limits
// opt back in with FORCE_RATE_LIMITS=1.
const skipInTests = () => Boolean(process.env.JEST_WORKER_ID) && !process.env.FORCE_RATE_LIMITS;

function limiter(windowMs: number, limit: number, extra: Partial<Options> = {}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: tooMany,
    skip: skipInTests,
    ...extra,
  });
}

/** Every /api request: about 5 a second per address, far above normal use. */
export const apiLimiter = limiter(60 * 1000, 300);

/** Login: 10 tries per 15 minutes for one email from one address. */
export const loginLimiter = limiter(15 * 60 * 1000, 10, {
  keyGenerator: (req: Request) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    return `${ipKeyGenerator(req.ip ?? '')}|${email}`;
  },
});

/** Sign-up: 5 new accounts per hour per address. */
export const signupLimiter = limiter(60 * 60 * 1000, 5);

/** Pre-launch access codes: 10 guesses per 15 minutes per address. */
export const accessCodeLimiter = limiter(15 * 60 * 1000, 10);

/** Feedback: 10 messages an hour per account (runs after requireAuth). */
export const feedbackLimiter = limiter(60 * 60 * 1000, 10, {
  keyGenerator: (req: Request) => req.auth?.userId ?? ipKeyGenerator(req.ip ?? ''),
});
