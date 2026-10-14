import { env } from '../config/env';
import {
  GROWTH_ASSUMED_MONTHLY_CHURN,
  GROWTH_ASSUMED_TRIAL_CONVERSION,
  GROWTH_DEFAULT_LAUNCH_DATE,
  GROWTH_GOAL_MEMBERS,
} from '../config/constants';
import { User } from '../models/User';
import { SubscriptionEvent, ISubscriptionEvent } from '../models/SubscriptionEvent';
import { easternDayBounds, easternMonthBounds } from './usageLimits.service';

// Admin, Growth: paying members against the year-one goal, trial conversion and
// churn, measured from SubscriptionEvent rows (every membership status change).

const DAY = 86_400_000;
const PAID = new Set(['active', 'past_due']);

export interface GrowthTally {
  trialStarts: number;
  conversions: number; // trial -> paid
  trialLosses: number; // trial ended without paying (cancelled or expired)
  refusedTrials: number; // one-trial-per-card refusals; not counted as real trials
  newPaid: number; // became a paying member (from a trial or directly)
  paidCancels: number; // a paying member's membership ended
}

type EventLike = Pick<ISubscriptionEvent, 'from' | 'to' | 'reason'>;

export function tally(events: EventLike[]): GrowthTally {
  const t: GrowthTally = {
    trialStarts: 0,
    conversions: 0,
    trialLosses: 0,
    refusedTrials: 0,
    newPaid: 0,
    paidCancels: 0,
  };
  for (const e of events) {
    const refused = e.reason === 'card-reused';
    if (e.to === 'trial' && !refused) t.trialStarts++;
    if (e.from === 'trial' && PAID.has(e.to)) t.conversions++;
    if (e.from === 'trial' && !PAID.has(e.to) && e.to !== 'trial') {
      if (refused) t.refusedTrials++;
      else t.trialLosses++;
    }
    if (PAID.has(e.to) && !PAID.has(e.from)) t.newPaid++;
    if (PAID.has(e.from) && !PAID.has(e.to)) t.paidCancels++;
  }
  return t;
}

export function rate(part: number, whole: number): number | null {
  return whole > 0 ? part / whole : null;
}

/**
 * New paying members needed each month to reach `target` by the deadline,
 * given monthly churn `c`: target = N0(1-c)^m + A(1-(1-c)^m)/c, solved for A.
 */
export function requiredMonthlyAdds(current: number, target: number, months: number, c: number): number | null {
  if (months <= 0) return null;
  if (c <= 0) return Math.max(0, Math.ceil((target - current) / months));
  const keep = Math.pow(1 - c, months);
  return Math.max(0, Math.ceil(((target - current * keep) * c) / (1 - keep)));
}

export async function growthSummary(now: Date = new Date()) {
  const counts = await User.aggregate<{ _id: string; n: number }>([
    { $match: { role: { $ne: 'admin' } } },
    { $group: { _id: '$subscriptionStatus', n: { $sum: 1 } } },
  ]);
  const byStatus = Object.fromEntries(counts.map((c) => [c._id, c.n])) as Record<string, number>;
  const paying = (byStatus.active ?? 0) + (byStatus.past_due ?? 0);

  // The last 30 days, and every month since the earliest event (up to 12).
  const since30 = new Date(now.getTime() - 30 * DAY);
  const recent = tally(
    await SubscriptionEvent.find({ at: { $gte: since30 } })
      .select('from to reason')
      .lean(),
  );
  const allTime = tally(await SubscriptionEvent.find().select('from to reason').lean());

  // Monthly churn: paying members lost in the last 30 days over those paying 30 days ago.
  const payingThen = paying - recent.newPaid + recent.paidCancels;
  const churn30 = rate(recent.paidCancels, payingThen);
  const conversion = rate(allTime.conversions, allTime.conversions + allTime.trialLosses);

  // The goal: GROWTH_GOAL_MEMBERS paying members one year after launch.
  const launch = new Date(`${env.FOUNDER_LAUNCH_DATE ?? GROWTH_DEFAULT_LAUNCH_DATE}T00:00:00-05:00`);
  const deadline = new Date(launch);
  deadline.setFullYear(deadline.getFullYear() + 1);
  const monthsLeft = Math.max(0, (deadline.getTime() - Math.max(now.getTime(), launch.getTime())) / (30.44 * DAY));
  // Measured rates once there's enough data to mean anything, assumptions until then.
  const churnUsed = churn30 !== null && payingThen >= 20 ? churn30 : GROWTH_ASSUMED_MONTHLY_CHURN;
  const conversionUsed =
    conversion !== null && allTime.conversions + allTime.trialLosses >= 20
      ? conversion
      : GROWTH_ASSUMED_TRIAL_CONVERSION;
  const neededPerMonth = requiredMonthlyAdds(paying, GROWTH_GOAL_MEMBERS, monthsLeft, churnUsed);

  return {
    now: {
      paying,
      trials: byStatus.trial ?? 0,
      freeAccess: byStatus.demo ?? 0,
      ended: byStatus.canceled ?? 0,
      neverSubscribed: byStatus.none ?? 0,
    },
    last30: {
      ...recent,
      churn: churn30,
      conversion: rate(recent.conversions, recent.conversions + recent.trialLosses),
    },
    allTime: { ...allTime, conversion },
    goal: {
      target: GROWTH_GOAL_MEMBERS,
      launch: launch.toISOString(),
      deadline: deadline.toISOString(),
      monthsLeft: Math.round(monthsLeft * 10) / 10,
      progress: paying / GROWTH_GOAL_MEMBERS,
      churnUsed,
      churnIsAssumed: churnUsed !== churn30,
      conversionUsed,
      conversionIsAssumed: conversionUsed !== conversion,
      neededPerMonth,
      trialsNeededPerMonth: neededPerMonth === null ? null : Math.ceil(neededPerMonth / conversionUsed),
      onPace: neededPerMonth === null ? null : recent.newPaid >= neededPerMonth,
    },
  };
}

// ---- Chart series ----------------------------------------------------------

export type GrowthRange = 'week' | 'month' | '6months' | 'year';

export interface GrowthPoint extends GrowthTally {
  start: string;
  end: string;
  /** Members at the end of the bucket. */
  paying: number;
  trials: number;
}

/** Bucket boundaries, oldest first: days for a week or month, weeks for 6 months, months for a year (Eastern time). */
export function bucketsFor(range: GrowthRange, now: Date): { start: Date; end: Date }[] {
  const out: { start: Date; end: Date }[] = [];
  if (range === 'week' || range === 'month') {
    let day = easternDayBounds(now);
    for (let i = 0; i < (range === 'week' ? 7 : 30); i++) {
      out.unshift(day);
      day = easternDayBounds(new Date(day.start.getTime() - 3600_000));
    }
  } else if (range === '6months') {
    // 26 weeks ending today; each week runs Monday to Sunday.
    let day = easternDayBounds(now);
    let end = day.end;
    for (let i = 0; i < 26; i++) {
      let start = day.start;
      // walk back to Monday
      for (let k = 0; k < 7 && new Date(start.getTime() + 12 * 3600_000).getUTCDay() !== 1; k++) {
        start = easternDayBounds(new Date(start.getTime() - 3600_000)).start;
      }
      out.unshift({ start, end });
      end = start;
      day = easternDayBounds(new Date(start.getTime() - 3600_000));
    }
  } else {
    let month = easternMonthBounds(now);
    for (let i = 0; i < 12; i++) {
      out.unshift(month);
      month = easternMonthBounds(new Date(month.start.getTime() - 3600_000));
    }
  }
  return out;
}

const countDelta = (events: EventLike[], set: (s: string) => boolean) =>
  events.reduce((n, e) => n + (set(e.to) ? 1 : 0) - (set(e.from) ? 1 : 0), 0);

/**
 * Members over time for the chart. Counts at a past moment are rebuilt by
 * undoing every status change since then from today's counts.
 */
export async function growthSeries(range: GrowthRange, now: Date = new Date()): Promise<GrowthPoint[]> {
  const buckets = bucketsFor(range, now);
  const counts = await User.aggregate<{ _id: string; n: number }>([
    { $match: { role: { $ne: 'admin' } } },
    { $group: { _id: '$subscriptionStatus', n: { $sum: 1 } } },
  ]);
  const byStatus = Object.fromEntries(counts.map((c) => [c._id, c.n])) as Record<string, number>;
  const payingNow = (byStatus.active ?? 0) + (byStatus.past_due ?? 0);
  const trialsNow = byStatus.trial ?? 0;

  const events = await SubscriptionEvent.find({ at: { $gte: buckets[0].start } })
    .select('from to reason at')
    .sort({ at: 1 })
    .lean();
  const isPaid = (s: string) => PAID.has(s);
  const isTrial = (s: string) => s === 'trial';

  return buckets.map((b) => {
    const inside = events.filter((e) => e.at >= b.start && e.at < b.end);
    const after = events.filter((e) => e.at >= b.end);
    return {
      start: b.start.toISOString(),
      end: b.end.toISOString(),
      paying: payingNow - countDelta(after, isPaid),
      trials: trialsNow - countDelta(after, isTrial),
      ...tally(inside),
    };
  });
}
