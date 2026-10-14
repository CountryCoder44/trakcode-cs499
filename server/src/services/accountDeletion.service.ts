import { IUser, User } from '../models/User';
import { AppError } from '../errors/AppError';
import { getStripeClient } from './stripeClient';
import { deleteUsersAndData } from './devReset.service';
import { emailKey } from './entitlements.service';
import { sendEmail } from './email/mailer';
import { accountDeletedEmail, accountDeletionScheduledEmail } from './email/templates';

// "Delete my account" (Profile → Account).
//
//  - A membership that is still set to renew is cancelled as part of the
//    request, so nobody is left paying for a deleted account: a free trial
//    ends right away (no charge) and the account is deleted now; a paid
//    membership stops renewing and the account is deleted when the paid time
//    runs out (Terms §9, Privacy Policy §6).
//  - A cancelled membership with paid time left schedules the deletion for the
//    end of that time. An hourly sweep (runScheduledDeletions) carries it out,
//    and calls it off if the learner renewed in the meantime.
//  - Otherwise the account is deleted right away.
//
// Deleted: the account and everything that belongs only to it (see
// deleteUsersAndData). Kept on purpose: the per-email founding-member and
// free-trial record, Stripe's own billing records, and anything already pushed
// to the learner's GitHub.

const RUNNING = ['trial', 'active', 'past_due'];

export type DeletionState =
  | { kind: 'admin' }
  /** Set to renew: deleting also cancels it (a trial ends now, paid time runs out first). */
  | { kind: 'renewing'; renewsOn: Date | null; trial: boolean }
  | { kind: 'at-period-end'; deleteOn: Date }
  | { kind: 'scheduled'; deleteOn: Date }
  | { kind: 'immediate' };

export function deletionState(user: IUser, now = new Date()): DeletionState {
  if (user.role === 'admin') return { kind: 'admin' };
  const running = RUNNING.includes(user.subscriptionStatus) && Boolean(user.stripeSubscriptionId);
  if (running && !user.cancelAtPeriodEnd) {
    return {
      kind: 'renewing',
      renewsOn: user.currentPeriodEnd ?? user.trialEndsAt ?? null,
      trial: user.subscriptionStatus === 'trial',
    };
  }
  if (user.deletionScheduledFor) return { kind: 'scheduled', deleteOn: user.deletionScheduledFor };
  const paidUntil = user.currentPeriodEnd ?? user.trialEndsAt;
  if (running && paidUntil && paidUntil > now) return { kind: 'at-period-end', deleteOn: paidUntil };
  return { kind: 'immediate' };
}

/**
 * Stop a membership from renewing because its account is being deleted. A
 * trial is cancelled outright (cancelling a trial ends it immediately, as
 * everywhere else); a paid membership runs to the end of its paid time.
 * Returns when the account should be deleted (now, or the end of the paid time).
 */
async function cancelForDeletion(user: IUser, now: Date): Promise<Date | 'now'> {
  const stripe = getStripeClient();
  if (!stripe || !user.stripeSubscriptionId) {
    throw new AppError(
      "We couldn't cancel your membership automatically. Cancel it under Billing → Manage subscription, then delete your account.",
      503,
      { code: 'MEMBERSHIP_ACTIVE' }
    );
  }
  const paidUntil = user.subscriptionStatus === 'trial' ? null : user.currentPeriodEnd;
  if (!paidUntil || paidUntil <= now) {
    await stripe.subscriptions.cancel(user.stripeSubscriptionId);
    user.subscriptionStatus = 'canceled';
    await user.save();
    return 'now';
  }
  await stripe.subscriptions.update(user.stripeSubscriptionId, { cancel_at_period_end: true });
  user.cancelAtPeriodEnd = true;
  return paidUntil;
}

async function scheduleDeletion(user: IUser, deleteOn: Date): Promise<{ scheduledFor: Date }> {
  user.deletionScheduledFor = deleteOn;
  await user.save();
  sendEmail(accountDeletionScheduledEmail(user.email, user.name, deleteOn)).catch((err) => {
    // eslint-disable-next-line no-console
    console.error('deletion scheduled email failed to send', err);
  });
  return { scheduledFor: deleteOn };
}

async function deleteNow(user: IUser): Promise<void> {
  const { email, name } = user;
  await deleteUsersAndData([user._id]);
  sendEmail(accountDeletedEmail(email, name)).catch((err) => {
    // eslint-disable-next-line no-console
    console.error('account deleted email failed to send', err);
  });
}

/**
 * Delete (or schedule deleting) the signed-in learner's account. The learner
 * types their email to confirm. Returns what happened.
 */
export async function requestAccountDeletion(
  userId: string,
  confirmEmail: string
): Promise<{ deleted: true } | { scheduledFor: Date }> {
  const user = await User.findById(userId);
  if (!user) throw new AppError('Account not found', 404);
  if (emailKey(confirmEmail) !== emailKey(user.email)) {
    throw new AppError("That email doesn't match this account. Type your account's email to confirm.", 400);
  }

  const state = deletionState(user);
  switch (state.kind) {
    case 'admin':
      throw new AppError("Admin accounts can't be deleted from here.", 403);
    case 'renewing': {
      const when = await cancelForDeletion(user, new Date());
      if (when === 'now') {
        await deleteNow(user);
        return { deleted: true };
      }
      return scheduleDeletion(user, when);
    }
    case 'scheduled':
      return { scheduledFor: state.deleteOn };
    case 'at-period-end':
      return scheduleDeletion(user, state.deleteOn);
    case 'immediate':
      await deleteNow(user);
      return { deleted: true };
  }
}

export async function cancelScheduledDeletion(userId: string): Promise<void> {
  await User.updateOne({ _id: userId }, { $unset: { deletionScheduledFor: 1 } });
}

/**
 * Carry out deletions whose date has come. A learner who renewed in the
 * meantime keeps their account (the schedule is simply cleared).
 */
export async function runScheduledDeletions(now = new Date()): Promise<{ deleted: number; kept: number }> {
  const due = await User.find({ deletionScheduledFor: { $lte: now }, role: { $ne: 'admin' } });
  let deleted = 0;
  let kept = 0;
  for (const user of due) {
    const running = RUNNING.includes(user.subscriptionStatus) && Boolean(user.stripeSubscriptionId);
    if (running && !user.cancelAtPeriodEnd) {
      await cancelScheduledDeletion(user.id);
      kept++;
      continue;
    }
    await deleteNow(user);
    deleted++;
  }
  return { deleted, kept };
}

const SWEEP_EVERY_MS = 60 * 60 * 1000;

/** Hourly sweep for scheduled deletions, started once at server boot. */
export function startDeletionSweeper(): NodeJS.Timeout {
  const sweep = () =>
    runScheduledDeletions()
      .then((r) => {
        // eslint-disable-next-line no-console
        if (r.deleted || r.kept) console.log(`[account deletion] deleted ${r.deleted}, kept (renewed) ${r.kept}`);
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('[account deletion] sweep failed', err);
      });
  void sweep();
  const timer = setInterval(sweep, SWEEP_EVERY_MS);
  timer.unref();
  return timer;
}
