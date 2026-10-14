import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.routes';
import practiceRoutes from './routes/practice.routes';
import seqRoutes from './routes/seq.routes';
import tutorRoutes from './routes/tutor.routes';
import portfolioRoutes from './routes/portfolio.routes';
import profileRoutes from './routes/profile.routes';
import roadmapRoutes from './routes/roadmap.routes';
import billingRoutes from './routes/billing.routes';
import adminRoutes from './routes/admin.routes';
import feedbackRoutes from './routes/feedback.routes';
import { handleWebhook } from './controllers/billing.controller';
import { errorHandler } from './middleware/errorHandler';
import { requireSubscription } from './middleware/subscription.middleware';
import { apiLimiter } from './middleware/rateLimit.middleware';

export function createApp() {
  const app = express();
  // One proxy (Caddy) in front in production: req.ip is the real visitor
  // address, which the request limits below key on.
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors());

  // Stripe webhook signature verification needs the RAW request body, so this
  // route is registered with its own express.raw() parser before the global
  // express.json() below — for this exact path, Express resolves the request
  // here and never reaches the JSON parser. Spec §7: "Stripe-signed, not
  // user-authed" — no requireAuth on this route.
  app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), handleWebhook);

  // Feedback can carry a screenshot (a JPEG as a data URL), so that one route
  // gets a larger body limit; everything else keeps express.json's default.
  const jsonDefault = express.json();
  const jsonFeedback = express.json({ limit: '4mb' });
  app.use((req, res, next) =>
    req.method === 'POST' && req.path === '/api/feedback' ? jsonFeedback(req, res, next) : jsonDefault(req, res, next)
  );

  app.get('/health', (_req, res) => res.json({ ok: true }));

  // Request limits for every /api route. The Stripe webhook above is registered
  // first, so it's never limited.
  app.use('/api', apiLimiter);

  // Paywall: Learn, Practice, Trak and portfolio push need an active
  // subscription or trial (see middleware/subscription.middleware.ts). Auth,
  // profile, billing, roadmap and admin stay reachable so a learner can sign in,
  // see their account, and subscribe.
  app.use(
    ['/api/practice', '/api/tutor', '/api/portfolio', '/api/seq'],
    requireSubscription
  );

  // Base path /api per spec §7 — full route surface is now wired up.
  app.use('/api/auth', authRoutes);
  app.use('/api/practice', practiceRoutes);
  app.use('/api/tutor', tutorRoutes);
  app.use('/api/portfolio', portfolioRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/roadmap', roadmapRoutes);
  app.use('/api/billing', billingRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/feedback', feedbackRoutes);
  app.use('/api/seq', seqRoutes);

  app.use(errorHandler);

  return app;
}
