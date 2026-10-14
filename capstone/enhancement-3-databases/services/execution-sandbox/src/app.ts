import express from 'express';
import executeRoutes from './routes/execute.routes';
import { errorHandler } from './middleware/errorHandler';

export function createApp() {
  const app = express();

  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true }));

  // Base path /internal per spec §4 — not public-facing, called only by the main API.
  app.use('/internal', executeRoutes);

  app.use(errorHandler);

  return app;
}
