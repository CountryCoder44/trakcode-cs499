import { ErrorRequestHandler } from 'express';
import { z } from 'zod';
import { isProduction, isCapstoneSubmission } from '../config/env';
import { AppError } from '../errors/AppError';

// Friendly wording for the handful of unique-index collisions this app
// actually defines (Mongo's raw E11000 error is accurate but not
// presentable). Anything not in this table still gets a real 409 with a
// generic message instead of falling through to a raw 500 — better to be
// generic than wrong.
const DUPLICATE_KEY_MESSAGES: Record<string, string> = {
  code: 'A demo code with that code already exists',
  'profile.slug': 'That slug is already taken',
};

function duplicateKeyMessage(err: Record<string, unknown>): string {
  const keyValue = err.keyValue as Record<string, unknown> | undefined;
  const field = keyValue ? Object.keys(keyValue)[0] : undefined;
  return (field && DUPLICATE_KEY_MESSAGES[field]) || 'A record with that value already exists';
}

function isMongoDuplicateKeyError(err: unknown): err is Record<string, unknown> {
  return typeof err === 'object' && err !== null && (err as Record<string, unknown>).code === 11000;
}

/**
 * The single place an error becomes an HTTP response. Every controller's
 * `catch (err) { next(err); }` ends up here — no controller needs its own
 * `handleXError` anymore. Previously this existed once per controller (ten
 * near-identical copies), each re-checking `err instanceof z.ZodError` and
 * a handful hand-rolling their own `err.message.includes(...)` checks for
 * domain failures. Zod validation and Mongo duplicate-key errors are handled
 * once here for every route; a domain failure is handled by throwing the
 * right `AppError` subclass (see `errors/AppError.ts`) instead of a plain
 * `Error` with a message a controller has to pattern-match against.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof z.ZodError) {
    res.status(400).json({ error: 'Validation failed', details: err.flatten().fieldErrors });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message, ...(err.details ? { details: err.details } : {}) });
    return;
  }

  if (isMongoDuplicateKeyError(err)) {
    res.status(409).json({ error: duplicateKeyMessage(err) });
    return;
  }

  // eslint-disable-next-line no-console
  console.error(err);
  const status = typeof (err as { status?: unknown })?.status === 'number' ? (err as { status: number }).status : 500;
  const hideDetails = isProduction || isCapstoneSubmission;
  res.status(status).json({
    error: (err as { message?: string })?.message || 'Internal server error',
    // Never leak stack traces in production or the frozen capstone-submission snapshot.
    ...(hideDetails ? {} : { stack: (err as { stack?: string })?.stack }),
  });
};
