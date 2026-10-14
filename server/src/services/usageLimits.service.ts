import mongoose from 'mongoose';
import { takeBoughtQuestion } from './trakPacks.service';
import { AppError } from '../errors/AppError';
import { IUser, User } from '../models/User';
import { UsageEvent, UsageKind } from '../models/UsageEvent';
import { AiUsageLog } from '../models/AiUsageLog';
import {
  AI_MONTHLY_COST_BACKSTOP_USD,
  BACKSTOP_ALLOWANCE_PER_BONUS_QUESTION_USD,
  PRACTICE_GENERATIONS_PER_MONTH,
  TRAK_BURST,
  TRAK_QUESTIONS_PER_WEEK,
  TRAK_REFILL_MS,
  TRIAL_PRACTICE_GENERATIONS,
  TRIAL_TRAK_QUESTIONS_PER_DAY,
} from '../config/constants';

// Per-learner allowances, decided with the owner 2026-10-11. Everything is per
// learner: no site-wide limit, so a few heavy users can never lock anyone out.
//
//                  Trak questions          New AI practice questions
//   member         100 / week (Mon)        20 / calendar month
//   free trial     20 / day                5 for the whole trial
//   admin          unlimited               unlimited
//
// Periods reset at midnight US Eastern. Only messages the learner sends count
// (never Trak's replies or automatic greetings, never a failed request).
// Behind those, a hidden backstop stops Trak if one learner's estimated AI
// spend this month passes AI_MONTHLY_COST_BACKSTOP_USD; only abuse should
// ever reach it. Separately, a short-term speed limit (TRAK_BURST messages,
// then one per TRAK_REFILL_MS) keeps scripts from hammering Trak; the client
// queues over-speed messages and shows "Trak is thinking…" meanwhile.

export type LimitPlan = 'unlimited' | 'member' | 'trial' | 'none';

export interface Allowance {
  limit: number;
  used: number;
  remaining: number;
  /** 'week' | 'day' | 'month' | 'trial' */
  period: 'week' | 'day' | 'month' | 'trial';
  /** When the allowance refills; null for the trial's one-off practice allowance. */
  resetsAt: string | null;
}

/**
 * The combined monthly fair-use limit on AI (Trak + new practice questions),
 * shown to the learner as a percentage (Terms: "Usage allowances"). Resets on
 * the 1st, Eastern.
 */
export interface FairUse {
  percentUsed: number;
  resetsAt: string;
}

export interface UsageSummary {
  plan: LimitPlan;
  trak: Allowance | null;
  practice: Allowance | null;
  /** Bought Trak questions left (tutoring packs), used once `trak` runs out. */
  bonusTrak: number;
  /** null = no limit (admins, or no plan). */
  fairUse: FairUse | null;
}

export function planFor(user: Pick<IUser, 'role' | 'subscriptionStatus'>): LimitPlan {
  if (user.role === 'admin') return 'unlimited';
  if (user.subscriptionStatus === 'trial') return 'trial';
  if (['active', 'past_due', 'demo'].includes(user.subscriptionStatus)) return 'member';
  return 'none';
}

// ---- US Eastern calendar boundaries ---------------------------------------

const ET = 'America/New_York';

function etParts(at: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ET,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
    weekday: 'short',
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday')),
  };
}

/** The UTC instant of 00:00 Eastern on the given Eastern calendar date. */
export function easternMidnight(year: number, month: number, day: number): Date {
  // Start from midnight UTC on that date, then shift by however far Eastern
  // wall time is from it (4 or 5 hours, depending on daylight time).
  let guess = Date.UTC(year, month - 1, day, 0, 0);
  for (let i = 0; i < 2; i++) {
    const p = etParts(new Date(guess));
    const wallAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    guess += Date.UTC(year, month - 1, day, 0, 0) - wallAsUtc;
  }
  return new Date(guess);
}

function addEasternDays(year: number, month: number, day: number, days: number): Date {
  const d = new Date(Date.UTC(year, month - 1, day + days));
  return easternMidnight(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

export function easternDayBounds(now: Date) {
  const p = etParts(now);
  return { start: easternMidnight(p.year, p.month, p.day), end: addEasternDays(p.year, p.month, p.day, 1) };
}

/** Weeks run Monday 00:00 to the next Monday 00:00, Eastern. */
export function easternWeekBounds(now: Date) {
  const p = etParts(now);
  const sinceMonday = (p.weekday + 6) % 7;
  return {
    start: addEasternDays(p.year, p.month, p.day, -sinceMonday),
    end: addEasternDays(p.year, p.month, p.day, 7 - sinceMonday),
  };
}

export function easternMonthBounds(now: Date) {
  const p = etParts(now);
  const next = p.month === 12 ? { y: p.year + 1, m: 1 } : { y: p.year, m: p.month + 1 };
  return { start: easternMidnight(p.year, p.month, 1), end: easternMidnight(next.y, next.m, 1) };
}

// ---- counting -------------------------------------------------------------

async function countSince(userId: string | mongoose.Types.ObjectId, kind: UsageKind, since: Date): Promise<number> {
  // Questions paid for from a tutoring pack don't use up the period's allowance.
  return UsageEvent.countDocuments({ userId, kind, bonus: { $ne: true }, createdAt: { $gte: since } });
}

function trialStart(user: Pick<IUser, 'trialEndsAt' | 'createdAt'>): Date {
  // Trials are 7 days; trialEndsAt comes from Stripe.
  if (user.trialEndsAt) return new Date(user.trialEndsAt.getTime() - 7 * 24 * 60 * 60 * 1000);
  return user.createdAt;
}

function allowance(limit: number, used: number, period: Allowance['period'], resetsAt: Date | null): Allowance {
  return { limit, used, remaining: Math.max(0, limit - used), period, resetsAt: resetsAt ? resetsAt.toISOString() : null };
}

export async function getUsage(user: IUser, now = new Date()): Promise<UsageSummary> {
  const plan = planFor(user);
  const bonusTrak = user.bonusTrakQuestions ?? 0;
  if (plan === 'unlimited' || plan === 'none') return { plan, trak: null, practice: null, bonusTrak, fairUse: null };
  const userId = String(user._id);

  if (plan === 'trial') {
    const day = easternDayBounds(now);
    const [trakUsed, practiceUsed, fairUse] = await Promise.all([
      countSince(user._id as mongoose.Types.ObjectId, 'trak-question', day.start),
      countSince(user._id as mongoose.Types.ObjectId, 'practice-generation', trialStart(user)),
      fairUseFor(userId, now),
    ]);
    return {
      plan,
      trak: allowance(TRIAL_TRAK_QUESTIONS_PER_DAY, trakUsed, 'day', day.end),
      practice: allowance(TRIAL_PRACTICE_GENERATIONS, practiceUsed, 'trial', null),
      bonusTrak,
      fairUse,
    };
  }

  const week = easternWeekBounds(now);
  const month = easternMonthBounds(now);
  const [trakUsed, practiceUsed, fairUse] = await Promise.all([
    countSince(user._id as mongoose.Types.ObjectId, 'trak-question', week.start),
    countSince(user._id as mongoose.Types.ObjectId, 'practice-generation', month.start),
    fairUseFor(userId, now),
  ]);
  return {
    plan,
    trak: allowance(TRAK_QUESTIONS_PER_WEEK, trakUsed, 'week', week.end),
    practice: allowance(PRACTICE_GENERATIONS_PER_MONTH, practiceUsed, 'month', month.end),
    bonusTrak,
    fairUse,
  };
}

/** True when the next Trak question would come out of bought questions. */
export function usesBonus(usage: UsageSummary): boolean {
  return Boolean(usage.trak && usage.trak.remaining <= 0 && usage.bonusTrak > 0);
}

/** A limit was reached. `details.code` tells the client which message to show. */
export class UsageLimitError extends AppError {
  constructor(message: string, details: Record<string, unknown>) {
    super(message, 429, details);
  }
}

async function loadUser(userId: string): Promise<IUser> {
  const user = await User.findById(userId);
  if (!user) throw new AppError('Invalid session', 401);
  return user;
}

async function monthlyAiSpend(userId: string, now: Date): Promise<number> {
  const { start } = easternMonthBounds(now);
  const [row] = await AiUsageLog.aggregate<{ total: number }>([
    { $match: { userId: new mongoose.Types.ObjectId(userId), createdAt: { $gte: start } } },
    { $group: { _id: null, total: { $sum: '$estimatedCostUsd' } } },
  ]);
  return row?.total ?? 0;
}

/** Throws UsageLimitError if this learner can't ask Trak another question right now. */
export async function assertCanAskTrak(userId: string, now = new Date()): Promise<UsageSummary> {
  const user = await loadUser(userId);
  const usage = await getUsage(user, now);
  if (usage.plan === 'unlimited') return usage;
  if (usage.trak && usage.trak.remaining <= 0 && usage.bonusTrak <= 0) {
    throw new UsageLimitError(
      usage.plan === 'trial'
        ? "You've used today's free-trial Trak questions."
        : "You've used this week's Trak questions.",
      { code: 'TRAK_LIMIT', usage }
    );
  }
  // Bought questions are never blocked by the fair-use limit (Terms): each one is
  // capped at TRAK_MESSAGE_BUDGET_USD and raises the limit by the same amount.
  if (!usesBonus(usage) && usage.fairUse && usage.fairUse.percentUsed >= 100) {
    throw new UsageLimitError("Trak has reached this month's limit for your account.", { code: 'TRAK_MONTHLY_BACKSTOP', usage });
  }
  return usage;
}

/**
 * The combined monthly AI limit (Trak + new practice generation). Bought
 * questions used this month raise it, so paying for more Trak never runs into
 * it early.
 */
async function fairUseFor(userId: string, now: Date): Promise<FairUse> {
  const month = easternMonthBounds(now);
  const [bonusUsedThisMonth, spend] = await Promise.all([
    UsageEvent.countDocuments({ userId, kind: 'trak-question', bonus: true, createdAt: { $gte: month.start } }),
    monthlyAiSpend(userId, now),
  ]);
  const limit = AI_MONTHLY_COST_BACKSTOP_USD + bonusUsedThisMonth * BACKSTOP_ALLOWANCE_PER_BONUS_QUESTION_USD;
  // Rounded down, and 100 only once the limit is really reached.
  const percentUsed = spend >= limit ? 100 : Math.min(99, Math.floor((spend / limit) * 100));
  return { percentUsed, resetsAt: month.end.toISOString() };
}

/** Throws UsageLimitError if this learner can't have another practice question generated. */
export async function assertCanGeneratePractice(userId: string, now = new Date()): Promise<void> {
  const user = await loadUser(userId);
  const usage = await getUsage(user, now);
  if (usage.plan === 'unlimited') return;
  if (usage.practice && usage.practice.remaining <= 0) {
    throw new UsageLimitError(
      usage.plan === 'trial'
        ? "You've used the free trial's new practice questions."
        : "You've used this month's new practice questions.",
      { code: 'PRACTICE_LIMIT', usage }
    );
  }
  // Generation counts toward the same combined monthly AI limit as Trak.
  if (usage.fairUse && usage.fairUse.percentUsed >= 100) {
    throw new UsageLimitError(
      "You've reached this month's limit for new practice questions. Practice problems that are already built still work.",
      { code: 'PRACTICE_LIMIT', usage }
    );
  }
}

export async function recordUsage(userId: string, kind: UsageKind): Promise<void> {
  await UsageEvent.create({ userId, kind });
}

/**
 * Counts one answered Trak question: from the weekly/daily allowance, or, once
 * that's used up, from bought questions. Returns the learner's allowance after it.
 */
export async function recordTrakQuestion(userId: string, usage: UsageSummary): Promise<UsageSummary> {
  if (usage.plan === 'unlimited') {
    await UsageEvent.create({ userId, kind: 'trak-question' });
    return usage;
  }
  if (usesBonus(usage)) {
    // Atomic, never below zero even with two messages at once, and taken from
    // the oldest pack first (services/trakPacks.service.ts).
    const { taken, packPurchaseId } = await takeBoughtQuestion(userId);
    await UsageEvent.create({ userId, kind: 'trak-question', bonus: taken, packPurchaseId: packPurchaseId ?? undefined });
    return { ...usage, bonusTrak: Math.max(0, usage.bonusTrak - 1) };
  }
  await UsageEvent.create({ userId, kind: 'trak-question' });
  if (!usage.trak) return usage;
  const used = usage.trak.used + 1;
  return { ...usage, trak: { ...usage.trak, used, remaining: Math.max(0, usage.trak.limit - used) } };
}

// ---- Trak speed limit (in memory: one API process) ------------------------
// A token bucket: TRAK_BURST tokens, one refilled every TRAK_REFILL_MS. Resets
// on restart, which only ever errs in the learner's favor.

const buckets = new Map<string, { tokens: number; updatedAt: number }>();

export function takeTrakToken(userId: string, now = Date.now()): { ok: true } | { ok: false; retryAfterMs: number } {
  const b = buckets.get(userId) ?? { tokens: TRAK_BURST, updatedAt: now };
  const refilled = Math.floor((now - b.updatedAt) / TRAK_REFILL_MS);
  if (refilled > 0) {
    b.tokens = Math.min(TRAK_BURST, b.tokens + refilled);
    b.updatedAt = b.tokens === TRAK_BURST ? now : b.updatedAt + refilled * TRAK_REFILL_MS;
  }
  if (b.tokens <= 0) {
    buckets.set(userId, b);
    return { ok: false, retryAfterMs: Math.max(1000, b.updatedAt + TRAK_REFILL_MS - now) };
  }
  b.tokens -= 1;
  buckets.set(userId, b);
  return { ok: true };
}

/** Gives the token back when a request fails on our side. */
export function returnTrakToken(userId: string): void {
  const b = buckets.get(userId);
  if (b) b.tokens = Math.min(TRAK_BURST, b.tokens + 1);
}

/** Test hook. */
export function resetTrakBuckets(): void {
  buckets.clear();
}

export function assertTrakSpeed(userId: string, plan: LimitPlan): void {
  if (plan === 'unlimited') return;
  const t = takeTrakToken(userId);
  if (!t.ok) {
    throw new UsageLimitError('Trak is still answering your earlier messages.', {
      code: 'TRAK_SLOW_DOWN',
      retryAfterMs: t.retryAfterMs,
    });
  }
}
