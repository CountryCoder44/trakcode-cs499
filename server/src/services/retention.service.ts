import { SafetyIncident } from '../models/SafetyIncident';
import { SubscriptionEvent } from '../models/SubscriptionEvent';
import { TrakPackPurchase } from '../models/TrakPackPurchase';

// Records kept after an account is deleted, and when they go (Privacy Policy §6).
// Run daily by startRetentionSweeper (index.ts).

// ---- Safety records ----
// How long Trak safety records are kept (owner decision 2026-10-12; Privacy
// Policy §6). A record still waiting for review is kept until it's reviewed.
//  - Reviewed and closed with no action or report: 90 days after the review.
//  - The learner was warned or banned: 3 years after the review.
//  - Reported to an authority: 3 years after the report (the law requires at
//    least 1 year for some reports).
//  - On legal hold: kept until an admin releases the hold.

const DAY = 24 * 60 * 60 * 1000;
export const SAFETY_RETENTION = {
  noActionDays: 90,
  actionedDays: 3 * 365,
  reportedDays: 3 * 365,
} as const;

/** Delete the safety records whose time is up. Returns how many went. */
export async function purgeExpiredSafetyIncidents(now = new Date()): Promise<number> {
  const before = (days: number) => new Date(now.getTime() - days * DAY);
  const notHeld = { legalHold: { $ne: true } };
  const notReported = { reportedAt: { $exists: false } };
  const { deletedCount } = await SafetyIncident.deleteMany({
    $or: [
      { ...notHeld, ...notReported, status: { $ne: 'open' }, action: 'none', reviewedAt: { $lt: before(SAFETY_RETENTION.noActionDays) } },
      { ...notHeld, ...notReported, status: { $ne: 'open' }, action: { $ne: 'none' }, reviewedAt: { $lt: before(SAFETY_RETENTION.actionedDays) } },
      { ...notHeld, reportedAt: { $lt: before(SAFETY_RETENTION.reportedDays) } },
    ],
  });
  return deletedCount ?? 0;
}

// ---- Billing records ----
// Membership changes and tutoring-pack purchases: 7 years, for tax and
// accounting. (The Terms-acceptance record lives on EmailEntitlement.)
export const BILLING_RECORD_YEARS = 7;

export async function purgeOldBillingRecords(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - BILLING_RECORD_YEARS * 365.25 * DAY);
  const [events, packs] = await Promise.all([
    SubscriptionEvent.deleteMany({ at: { $lt: cutoff } }),
    // A pack with questions still left is never deleted: bought questions don't expire.
    TrakPackPurchase.deleteMany({ createdAt: { $lt: cutoff }, remaining: { $lte: 0 } }),
  ]);
  return (events.deletedCount ?? 0) + (packs.deletedCount ?? 0);
}

const SWEEP_EVERY_MS = 24 * 60 * 60 * 1000;

/** Daily sweep, started once at server boot. */
export function startRetentionSweeper(): NodeJS.Timeout {
  const sweep = () =>
    Promise.all([purgeExpiredSafetyIncidents(), purgeOldBillingRecords()])
      .then(([safety, billing]) => {
        // eslint-disable-next-line no-console
        if (safety || billing) console.log(`[retention] deleted ${safety} safety record(s), ${billing} billing record(s)`);
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('[retention] sweep failed', err);
      });
  void sweep();
  const timer = setInterval(sweep, SWEEP_EVERY_MS);
  timer.unref();
  return timer;
}
