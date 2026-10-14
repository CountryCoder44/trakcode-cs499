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

  // ElevenLabs TTS for Sequential Curriculum narration — see AUDIO.md. All
  // optional so the server boots without them; the generator script guards on
  // TTS_ENABLED + key + voice id before it will call the API.
  ELEVENLABS_API_KEY: z.string().optional(),
  ELEVENLABS_VOICE_ID: z.string().optional(),
  ELEVENLABS_MODEL_ID: z.string().default('eleven_multilingual_v2'),
  // voice_settings sent with every ElevenLabs request. Defaults tuned for
  // steady narration: mid stability so short clips don't rush or drift in
  // accent at the end, neutral style, normal pace.
  ELEVENLABS_STABILITY: z.coerce.number().min(0).max(1).default(0.5),
  ELEVENLABS_SIMILARITY: z.coerce.number().min(0).max(1).default(0.75),
  ELEVENLABS_STYLE: z.coerce.number().min(0).max(1).default(0),
  ELEVENLABS_SPEED: z.coerce.number().min(0.7).max(1.2).default(1.0),
  TTS_ENABLED: z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === '1'),
  // Which engine `npm run tts:generate` uses. `elevenlabs` = the paid Trak
  // voice (costs credits). `sapi` = free, offline Windows Speech API — rough
  // placeholder narration for reviewing lessons before spending credits.
  TTS_PROVIDER: z.enum(['elevenlabs', 'sapi']).default('elevenlabs'),
  SAPI_VOICE: z.string().optional(), // e.g. "Microsoft Zira Desktop" / "Microsoft David Desktop"
  SAPI_RATE: z.coerce.number().min(-10).max(10).default(2), // SAPI speaking rate; 2 ≈ brisk, good for review
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
