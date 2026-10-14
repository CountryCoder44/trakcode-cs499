import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.routes';
import practiceRoutes from './routes/practice.routes';
import learnRoutes from './routes/learn.routes';
import tutorRoutes from './routes/tutor.routes';
import portfolioRoutes from './routes/portfolio.routes';
import profileRoutes from './routes/profile.routes';
import roadmapRoutes from './routes/roadmap.routes';
import billingRoutes from './routes/billing.routes';
import adminRoutes from './routes/admin.routes';
import { handleWebhook } from './controllers/billing.controller';
import { errorHandler } from './middleware/errorHandler';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());

  // Stripe webhook signature verification needs the RAW request body, so this
  // route is registered with its own express.raw() parser before the global
  // express.json() below — for this exact path, Express resolves the request
  // here and never reaches the JSON parser. Spec §7: "Stripe-signed, not
  // user-authed" — no requireAuth on this route.
  app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), handleWebhook);

  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ ok: true }));

  // Base path /api per spec §7 — full route surface is now wired up.
  app.use('/api/auth', authRoutes);
  app.use('/api/practice', practiceRoutes);
  app.use('/api/tutor', tutorRoutes);
  app.use('/api/portfolio', portfolioRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/roadmap', roadmapRoutes);
  app.use('/api/billing', billingRoutes);
  app.use('/api/admin', adminRoutes);
  // learnRoutes declares its own flat paths (/curriculum, /progress) — see learn.routes.ts
  app.use('/api', learnRoutes);

  app.use(errorHandler);

  return app;
}
