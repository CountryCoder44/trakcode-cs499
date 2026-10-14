import path from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';

// Per spec §2: three environments share this codebase (dev | capstone-submission |
// production). Locally we support a `.env.<NODE_ENV>` file per environment so you
// can point `dev` at a local/Atlas-dev cluster and `capstone-submission` at its own
// separate cluster (see open-decision resolution in .env.example) without them
// colliding. In real deployments these vars come from the platform instead.
const nodeEnv = process.env.NODE_ENV || 'dev';
dotenv.config({ path: path.resolve(__dirname, '..', '..', `.env.${nodeEnv}`) });
dotenv.config(); // fills any gaps from a plain .env, without overriding what's already set

const envSchema = z.object({
  NODE_ENV: z.enum(['dev', 'capstone-submission', 'production']).default('dev'),
  PORT: z.coerce.number().default(4000),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET should be a long random string'),

  // GitHub OAuth — optional so the server can boot before it's configured; the
  // /auth/github/* routes 503 with a clear message until these are set.
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_OAUTH_CALLBACK_URL: z.string().optional(),

  DEMO_CODE_ADMIN_KEY: z.string().optional(),

  // Not consumed until later build weeks (§9), but validated centrally now so every
  // service reads config the same way instead of reaching into process.env directly.
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_ID_MONTHLY: z.string().optional(),
  STRIPE_PRICE_ID_ANNUAL: z.string().optional(),
  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().optional(),
  AWS_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  EXECUTION_SERVICE_URL: z.string().optional(),

  // Additive beyond the spec's §2 list — see .env.example for why these exist.
  ENCRYPTION_KEY: z.string().optional(),
  FRONTEND_URL: z.string().optional(),
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
