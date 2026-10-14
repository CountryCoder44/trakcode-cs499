import { env } from '../config/env';
import { EmailEntitlement, IEmailEntitlement } from '../models/EmailEntitlement';

// Founding members and one-trial-per-email. See models/EmailEntitlement.ts.

/**
 * Normalizes an address so aliases of one inbox share a record: lowercased,
 * "+tag" dropped for every provider, and dots dropped for Gmail (which ignores
 * them). Only used as a lookup key; the real address is stored separately.
 */
export function emailKey(email: string): string {
  const [rawLocal, rawDomain = ''] = email.trim().toLowerCase().split('@');
  let domain = rawDomain;
  let local = rawLocal.split('+')[0];
  if (domain === 'googlemail.com') domain = 'gmail.com';
  if (domain === 'gmail.com') local = local.replace(/\./g, '');
  return `${local}@${domain}`;
}

/**
 * When the founding window closes: the end of the month six months after the
 * public launch date (FOUNDER_LAUNCH_DATE). `null` while no launch date is set,
 * which means the window is open. Month ends are taken in US Eastern time
 * (fixed UTC-5, so it can run up to an hour late in daylight time, never early).
 */
export function founderWindowEnd(launchDate: string | undefined = env.FOUNDER_LAUNCH_DATE): Date | null {
  if (!launchDate) return null;
  const [y, m] = launchDate.split('-').map(Number);
  // First day of the month AFTER (launch month + 6), at 00:00 Eastern = 05:00 UTC.
  const monthIndex = m - 1 + 6 + 1;
  return new Date(Date.UTC(y, monthIndex, 1, 5, 0, 0));
}

export function isFounderWindowOpen(at: Date = new Date(), launchDate: string | undefined = env.FOUNDER_LAUNCH_DATE): boolean {
  const end = founderWindowEnd(launchDate);
  return end === null || at < end;
}

/**
 * Records that an account exists for this email, granting founding status if
 * the account was created while the window was open. Safe to call repeatedly
 * (signup, checkout, billing page): founding status only ever turns on, never off.
 */
export async function recordAccountEmail(email: string, accountCreatedAt: Date): Promise<IEmailEntitlement> {
  const key = emailKey(email);
  const founding = isFounderWindowOpen(accountCreatedAt);

  const existing = await EmailEntitlement.findOne({ emailKey: key });
  if (existing) {
    if (!existing.foundingMember && founding) {
      existing.foundingMember = true;
      existing.foundingSince = accountCreatedAt;
      await existing.save();
    }
    return existing;
  }

  try {
    return await EmailEntitlement.create({
      emailKey: key,
      email,
      firstSeenAt: accountCreatedAt,
      foundingMember: founding,
      foundingSince: founding ? accountCreatedAt : undefined,
    });
  } catch (err) {
    // Two requests raced to create the same record; use the winner's.
    if ((err as { code?: number }).code === 11000) {
      return (await EmailEntitlement.findOne({ emailKey: key }))!;
    }
    throw err;
  }
}

export async function markTrialUsed(email: string): Promise<void> {
  await EmailEntitlement.updateOne(
    { emailKey: emailKey(email), trialUsedAt: { $exists: false } },
    { $set: { trialUsedAt: new Date() } }
  );
}
