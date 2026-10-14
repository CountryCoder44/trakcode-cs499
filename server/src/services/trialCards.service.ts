import Stripe from 'stripe';
import { TrialCard } from '../models/TrialCard';
import { User } from '../models/User';
import { emailKey } from './entitlements.service';
import { sendEmail } from './email/mailer';
import { trialCardReusedEmail } from './email/templates';
import { env } from '../config/env';

// One free trial per payment card, on top of one per email. Checked when Stripe
// reports a trialing subscription (billing webhook): the card's fingerprint is
// recorded on its first trial; if the same card later starts a trial for a
// different email, that trial is cancelled at once, with no charge, and the
// learner is told they can still subscribe (charged on subscribing, since the
// email's trial is now used too).

export type TrialCardCheck = 'first-use' | 'same-person' | 'reused' | 'unknown';

/** Records the card for this trial, or says it was already used by someone else. */
export async function claimTrialCard(
  fingerprint: string,
  email: string,
  userId: string,
  subscriptionId: string,
): Promise<TrialCardCheck> {
  const key = emailKey(email);
  try {
    await TrialCard.create({ fingerprint, emailKey: key, userId, subscriptionId });
    return 'first-use';
  } catch (err) {
    if ((err as { code?: number }).code !== 11000) throw err;
  }
  const existing = await TrialCard.findOne({ fingerprint });
  return existing && existing.emailKey === key ? 'same-person' : 'reused';
}

async function cardFingerprint(stripe: Stripe, sub: Stripe.Subscription): Promise<string | null> {
  let pm = sub.default_payment_method;
  if (!pm) {
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
    const customer = await stripe.customers.retrieve(customerId);
    if (!customer.deleted) pm = customer.invoice_settings?.default_payment_method ?? null;
  }
  if (!pm) return null;
  const method = typeof pm === 'string' ? await stripe.paymentMethods.retrieve(pm) : pm;
  return method.card?.fingerprint ?? null;
}

/**
 * For a trialing subscription: enforce one trial per card. Returns true when
 * the trial was cancelled because the card had already been used.
 */
export async function enforceOneTrialPerCard(
  stripe: Stripe,
  sub: Stripe.Subscription,
  cancel: (subscriptionId: string) => Promise<void>,
): Promise<boolean> {
  if (sub.status !== 'trialing') return false;
  const userId = sub.metadata?.userId;
  const user = userId ? await User.findById(userId) : null;
  if (!user) return false;
  // If Stripe can't tell us the card, let the trial stand rather than fail the
  // webhook (Stripe would retry it, and the subscription sync already ran).
  let fingerprint: string | null = null;
  try {
    fingerprint = await cardFingerprint(stripe, sub);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[billing] could not read the trial card fingerprint', err);
  }
  if (!fingerprint) return false;

  const check = await claimTrialCard(fingerprint, user.email, user.id, sub.id);
  if (check !== 'reused') return false;

  await cancel(sub.id);
  await User.updateOne({ _id: user._id }, { $set: { trialDeniedReason: 'card-reused' } });
  sendEmail(
    trialCardReusedEmail(
      user.email,
      user.name,
      `${(env.FRONTEND_URL ?? 'http://localhost:5173').replace(/\/$/, '')}/billing`,
    ),
  ).catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[billing] trial-card email failed', err);
  });
  return true;
}
