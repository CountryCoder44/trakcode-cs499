import path from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';

// Per spec §2: three environments share this codebase (dev | capstone-submission |
// production). Locally we support a `.env.<NODE_ENV>` file per environment so you
// can point `dev` at a local/Atlas-dev cluster and `capstone-submission` at its own
// separate cluster (see open-decision resolution in .env.example) without them
// colliding. In real deployments these vars come from the platform instead.
//
// Gotcha found wiring up Jest (see package.json's "test" script): Jest sets
// process.env.NODE_ENV = 'test' itself, before any test file runs, whenever it
// isn't already set — 'test' isn't one of the three enum values above and
// there's no .env.test, so envSchema.safeParse fails and the process.exit(1)
// below kills the whole Jest worker (not just one test) with a confusing
// "child process exceptions, exceeding retry limit" error. The fix is
// `cross-env NODE_ENV=dev jest` in package.json's test script — Jest only
// defaults NODE_ENV when it's unset, so setting it first makes tests run
// against .env.dev like everything else locally. Run `jest` directly
// (bypassing the npm script) and this breaks again.
const nodeEnv = process.env.NODE_ENV || 'dev';
dotenv.config({ path: path.resolve(__dirname, '..', '..', `.env.${nodeEnv}`) });
dotenv.config(); // fills any gaps from a plain .env, without overriding what's already set

const envSchema = z.object({
  NODE_ENV: z.enum(['dev', 'capstone-submission', 'production']).default('dev'),
  PORT: z.coerce.number().default(4000),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET should be a long random string'),

  // Social sign-in (services/oauth/providers.ts). Each provider is optional so
  // the server boots before it's configured: a provider with no client id/secret
  // is left out of GET /auth/providers (the client hides its button) and its
  // /auth/oauth/:provider/* routes 503. Every provider's redirect URI is
  // `${OAUTH_CALLBACK_BASE_URL}/<provider>/callback` — register exactly that.
  OAUTH_CALLBACK_BASE_URL: z.string().default('http://localhost:4000/api/auth/oauth'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  LINKEDIN_CLIENT_ID: z.string().optional(),
  LINKEDIN_CLIENT_SECRET: z.string().optional(),
  // LinkedIn's versioned REST API (Posts API) requires a YYYYMM version header
  // and supports each version for about a year. Bump this when it ages out.
  LINKEDIN_API_VERSION: z.string().regex(/^\d{6}$/).default('202606'),

  // Not consumed until later build weeks (§9), but validated centrally now so every
  // service reads config the same way instead of reaching into process.env directly.
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_ID_MONTHLY: z.string().optional(),
  // Stripe coupon: 20% off, duration "forever". Applied at checkout for
  // founding members (see services/entitlements.service.ts).
  STRIPE_FOUNDER_COUPON_ID: z.string().optional(),
  // Tutoring pack prices in Stripe (one-off). Unset: Checkout builds the price
  // inline from TRAK_PACKS instead. Sandbox and live have different IDs.
  STRIPE_PRICE_ID_PACK_50: z.string().optional(),
  STRIPE_PRICE_ID_PACK_150: z.string().optional(),
  STRIPE_PRICE_ID_PACK_400: z.string().optional(),
  // Stripe Tax: calculate sales tax at Checkout. Turn on only once Stripe Tax
  // is set up in that Stripe account (head office address saved), or Checkout
  // refuses the session.
  STRIPE_AUTOMATIC_TAX: z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === '1'),
  // The real public launch date (YYYY-MM-DD). The founding-member window stays
  // open until it's set, then closes at the end of the month six months later.
  // An empty `FOUNDER_LAUNCH_DATE=` line counts as unset.
  FOUNDER_LAUNCH_DATE: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'FOUNDER_LAUNCH_DATE must be YYYY-MM-DD')
      .optional()
  ),
  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().optional(),
  AWS_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  EXECUTION_SERVICE_URL: z.string().optional(),

  // Additive beyond the spec's §2 list — see .env.example for why these exist.
  ENCRYPTION_KEY: z.string().optional(),
  FRONTEND_URL: z.string().optional(),

  // Outgoing email (password resets and other account email) over SMTP.
  // Production uses Google Workspace's SMTP relay: smtp-relay.gmail.com, port
  // 587, no login. The relay only accepts mail from the server's Elastic IP
  // (configured in the Workspace Admin console) and from addresses in our
  // domains, so EMAIL_FROM must be a Workspace address or alias. SMTP_USER/PASS
  // are only for a password-based server (e.g. smtp.gmail.com with an app
  // password). Without SMTP_HOST, emails are printed to the server log instead
  // of sent (local dev and tests).
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_HELO_NAME: z.string().default('trakcode.com'),
  EMAIL_FROM: z.string().default('TrakCode <noreply@trakcode.com>'),
  EMAIL_REPLY_TO: z.string().default('support@trakcode.com'),
  // Where high/critical Trak safety flags are emailed for human review.
  SAFETY_ALERT_EMAIL: z.string().default('support@trakcode.com'),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment configuration:');
  // eslint-disable-next-line no-console
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env: Env = parsed.data;
export const isProduction = env.NODE_ENV === 'production';
export const isCapstoneSubmission = env.NODE_ENV === 'capstone-submission';
