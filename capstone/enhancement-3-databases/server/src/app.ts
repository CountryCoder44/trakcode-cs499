import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.routes';
import practiceRoutes from './routes/practice.routes';
import learnRoutes from './routes/learn.routes';
import seqRoutes from './routes/seq.routes';
import { AUDIO_CLIPS_DIR, AUDIO_URL_BASE } from './tts/audioManifest';
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
  app.use('/api/seq', seqRoutes);

  // Sequential Curriculum lesson-narration audio (mp3 + timing json). The dir
  // may not exist yet (nothing generated) — express.static 404s cleanly then.
  // helmet's global `Cross-Origin-Resource-Policy: same-origin` would stop the
  // client (a different dev origin) from loading these into an <audio> element,
  // so relax CORP to `cross-origin` for this public, static asset route only.
  app.use(
    AUDIO_URL_BASE,
    express.static(AUDIO_CLIPS_DIR, {
      maxAge: '1h',
      fallthrough: true,
      index: false,
      setHeaders: (res) => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'),
    })
  );

  app.use(errorHandler);

  return app;
}
