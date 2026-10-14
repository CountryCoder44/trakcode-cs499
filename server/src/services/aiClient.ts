import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env';

// Lazily constructed so the server can boot without AI_API_KEY set — callers
// that need it (problem generation §5, AI tutor §6) get a clear "not
// configured" error instead of a crash at import time.
let client: Anthropic | null | undefined;

export function getAnthropicClient(): Anthropic | null {
  if (client !== undefined) return client;
  client = env.AI_API_KEY ? new Anthropic({ apiKey: env.AI_API_KEY }) : null;
  return client;
}

// Model routing, per the product's AI Model Usage guidance: default to the
// reasoning-tier model for anything reasoning about problem content, user
// code, or curriculum context (problem generation, substantive tutor hints);
// route to the fast tier only for short, low-stakes, classification-style
// calls where deeper reasoning wouldn't change the output (tutor clarifying
// questions at hint level 0, the guardrail's leaked-solution check).
//
// AI_MODEL stays available as a deployer override for the reasoning tier
// (spec §2). The fast tier is intentionally fixed — it's a specific,
// low-risk choice for cheap classification calls, not something meant to
// vary per deployment.
export const MODEL_REASONING = env.AI_MODEL || 'claude-sonnet-5';
export const MODEL_FAST = 'claude-haiku-4-5';
/**
 * Owner decision 2026-10-12: Trak answers general questions on Haiku 5.5 and
 * switches to MODEL_REASONING when the learner seems stuck
 * (services/tutor/routing.ts). The solution check, readiness check and memory
 * note also run here. Safety screening stays on MODEL_FAST: Haiku 5.5's own
 * safety classifiers can decline to read an abusive message, which would let
 * it through the screen.
 */
export const MODEL_LIGHT = 'claude-haiku-5-5';
