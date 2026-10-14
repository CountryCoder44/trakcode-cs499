import { AiUsageLog, AiUsagePurpose, AiModelTier } from '../models/AiUsageLog';

// Anthropic list pricing, $/1M tokens. Sonnet 5's $2/$10 rate was launched
// as introductory pricing through 2026-08-31, but Anthropic has since made
// it the standard, permanent price — the previously-scheduled increase to
// $3.00/$15.00 on 2026-09-01 will not happen (confirmed against Anthropic's
// live pricing page, not the possibly-stale figure this comment used to
// carry — verify similarly before ever changing this table again rather
// than trusting a cached/remembered number). This is a best-effort ESTIMATE
// for internal cost-tracking only (see AiUsageLog.estimatedCostUsd) — the
// Anthropic Console's own billing is the real source of truth, not this
// table; real spend can differ from a list-price estimate for reasons this
// table can't see (account-specific discounts, etc.). An unrecognized model
// (a routing change, a new deployment override via AI_MODEL) silently
// estimates $0 rather than guessing a rate.
const PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-5': { input: 2.0, output: 10.0 },
  'claude-haiku-4-5': { input: 1.0, output: 5.0 },
};
// Anthropic's standard ephemeral (5-minute TTL) cache rates — a write costs
// more than a plain input token, a read costs much less.
const CACHE_WRITE_MULTIPLIER = 1.25;
const CACHE_READ_MULTIPLIER = 0.1;

interface UsageTokens {
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
}

function estimateCostUsd(modelId: string, usage: UsageTokens): number {
  const rate = PRICING[modelId];
  if (!rate) return 0;
  const perMillion = (tokens: number, multiplier = 1) => (tokens / 1_000_000) * multiplier;
  return (
    perMillion(usage.inputTokens) * rate.input +
    perMillion(usage.cacheCreationInputTokens, CACHE_WRITE_MULTIPLIER) * rate.input +
    perMillion(usage.cacheReadInputTokens, CACHE_READ_MULTIPLIER) * rate.input +
    perMillion(usage.outputTokens) * rate.output
  );
}

// Anthropic SDK's `Usage` shape — accepted structurally rather than imported
// so this doesn't need to know which SDK type (Usage vs BetaUsage) a given
// call site used. cache_* fields are nullable on some response shapes.
interface AnthropicUsageLike {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
}

// Shared by every AI call site (see tutor.service.ts and
// problemGeneration.service.ts) so instrumentation is uniform. Deliberately
// fire-and-forget, never awaited at the call site — matches the existing
// fail-open pattern already used for touchTutorMemory/extractMemoryUpdate
// elsewhere in this codebase: usage logging must never block or break the
// actual AI call it's instrumenting. Known gap, stated plainly: this only
// runs on the success path — a thrown/caught error at the call site means
// that call's tokens go unlogged. Acceptable for an internal estimate tool.
export function logAiUsage(params: {
  userId?: string;
  modelId: string;
  tier: AiModelTier;
  purpose: AiUsagePurpose;
  usage: AnthropicUsageLike;
}): void {
  const tokens: UsageTokens = {
    inputTokens: params.usage.input_tokens,
    outputTokens: params.usage.output_tokens,
    cacheCreationInputTokens: params.usage.cache_creation_input_tokens ?? 0,
    cacheReadInputTokens: params.usage.cache_read_input_tokens ?? 0,
  };

  AiUsageLog.create({
    userId: params.userId,
    modelId: params.modelId,
    tier: params.tier,
    purpose: params.purpose,
    ...tokens,
    estimatedCostUsd: estimateCostUsd(params.modelId, tokens),
  }).catch((err) => {
    // eslint-disable-next-line no-console
    console.error('ai usage logging failed', err);
  });
}
