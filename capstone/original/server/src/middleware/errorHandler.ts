import { ErrorRequestHandler } from 'express';
import { isProduction, isCapstoneSubmission } from '../config/env';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  const status = typeof err?.status === 'number' ? err.status : 500;
  const hideDetails = isProduction || isCapstoneSubmission;
  res.status(status).json({
    error: err?.message || 'Internal server error',
    // Never leak stack traces in production or the frozen capstone-submission snapshot.
    ...(hideDetails ? {} : { stack: err?.stack }),
  });
};
