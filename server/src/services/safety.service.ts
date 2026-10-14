import Anthropic from '@anthropic-ai/sdk';
import { Types } from 'mongoose';
import { env } from '../config/env';
import { User, IUser } from '../models/User';
import { EmailEntitlement } from '../models/EmailEntitlement';
import { SafetyIncident, ISafetyIncident, IncidentAction, IncidentStatus, SafetyCategory } from '../models/SafetyIncident';
import { NotFoundError, AppError } from '../errors/AppError';
import { emailKey } from './entitlements.service';
import { sendEmail } from './email/mailer';
import { misuseWarningEmail, safetyAlertEmail } from './email/templates';
import { getStripeClient } from './stripeClient';
import { renderTranscript } from './tutor/shared';
import type { ModerationVerdict } from './tutor/moderation';

// What happens after the moderation check flags a learner's message to Trak.
// Policy (user decision, 2026-10-11): a person reviews every flagged case before
// anything is reported, and incident records are kept permanently. The playbook
// is warn first, then ban if it continues (owner decision: no suspensions).
// Warning or banning is always a reviewer's choice in Admin, Safety; never automatic.

export const SAFETY_REFUSAL =
  "I can't help with that. I'm here to help you learn to code, so let's get back to that. " +
  'Misusing Trak breaks our Terms of Service and can lead to your account being closed.';

export const SELF_HARM_REPLY =
  "It sounds like you might be going through something really hard, and I'm glad you said something. " +
  "I'm a coding tutor, so I'm not the right kind of help for this, but people are ready to talk right now: " +
  'in the US, call or text 988 (Suicide & Crisis Lifeline), or text HOME to 741741. ' +
  'Outside the US, findahelpline.com lists free, confidential lines in your country. ' +
  'If you are in immediate danger, call your local emergency number. Coding can wait; you matter more.';

/** Trak doesn't answer these; the learner gets a fixed message instead. */
export function shouldBlock(v: ModerationVerdict): boolean {
  if (!v.flagged) return false;
  if (v.categories.includes('self-harm') && v.severity !== 'low') return true;
  return v.severity === 'high' || v.severity === 'critical';
}

export function blockedReply(v: ModerationVerdict): string {
  return v.categories.includes('self-harm') ? SELF_HARM_REPLY : SAFETY_REFUSAL;
}

function textOf(m: Anthropic.MessageParam): string {
  return typeof m.content === 'string' ? m.content : renderTranscript([m]);
}

export async function recordIncident(params: {
  userId: string;
  sessionId?: string;
  contextType: string;
  contextId: string;
  conversation: Anthropic.MessageParam[];
  verdict: ModerationVerdict;
  blocked: boolean;
  ip: string | null;
}): Promise<ISafetyIncident> {
  const { verdict, conversation } = params;
  const user = await User.findById(params.userId).select('email name');
  const incident = await SafetyIncident.create({
    userId: params.userId,
    userEmail: user?.email ?? '(unknown)',
    userName: user?.name ?? '',
    sessionId: params.sessionId && Types.ObjectId.isValid(params.sessionId) ? params.sessionId : undefined,
    contextType: params.contextType,
    contextId: params.contextId,
    message: textOf(conversation[conversation.length - 1]),
    recentContext: conversation.slice(-5, -1).map((m) => ({
      role: m.role === 'assistant' ? 'trak' : 'learner',
      content: textOf(m),
    })),
    categories: verdict.categories,
    severity: verdict.severity === 'none' ? 'low' : verdict.severity,
    rationale: verdict.rationale,
    blocked: params.blocked,
    ip: params.ip ?? undefined,
  });

  if (incident.severity === 'high' || incident.severity === 'critical') {
    const link = `${env.FRONTEND_URL ?? 'http://localhost:5173'}/admin?tab=safety`;
    sendEmail(safetyAlertEmail(env.SAFETY_ALERT_EMAIL, incident, link)).catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[safety] alert email failed', err);
    });
  }
  return incident;
}

export type Standing = { state: 'banned'; reason?: string } | null;

export function standingOf(user: Pick<IUser, 'role' | 'bannedAt' | 'standingReason'>): Standing {
  if (user.role === 'admin') return null;
  if (user.bannedAt) return { state: 'banned', reason: user.standingReason };
  return null;
}

/** True if a banned account used this email (blocks making a new account with it). */
export async function isEmailBanned(email: string): Promise<boolean> {
  const row = await EmailEntitlement.findOne({ emailKey: emailKey(email) })
    .select('bannedAt')
    .lean();
  return Boolean(row?.bannedAt);
}

export type StandingAction = 'ban' | 'restore';

/** Bans or restores an account. Banning also cancels any membership at Stripe. */
export async function setStanding(
  userId: string,
  action: StandingAction,
  opts: { reason?: string } = {},
): Promise<IUser> {
  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('User not found');
  if (user.role === 'admin') throw new AppError("Admin accounts can't be banned.", 400);

  const key = emailKey(user.email);
  if (action === 'restore') {
    user.set('bannedAt', undefined);
    user.set('standingReason', undefined);
    await EmailEntitlement.updateOne({ emailKey: key }, { $unset: { bannedAt: '' } });
  } else {
    user.bannedAt = new Date();
    user.standingReason = opts.reason;
    await EmailEntitlement.updateOne(
      { emailKey: key },
      { $set: { bannedAt: user.bannedAt }, $setOnInsert: { email: user.email, firstSeenAt: user.createdAt } },
      { upsert: true },
    );
    const stripe = getStripeClient();
    if (stripe && user.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.cancel(user.stripeSubscriptionId);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[safety] couldn't cancel a banned account's subscription; cancel it in Stripe by hand", err);
      }
    }
  }
  await user.save();
  return user;
}

const ACTION_RECORDED: Record<StandingAction, IncidentAction> = {
  ban: 'banned',
  restore: 'none',
};

/** A reviewer's decision on one incident, optionally applying an account action. */
export async function reviewIncident(
  incidentId: string,
  reviewerId: string,
  input: {
    status: Exclude<IncidentStatus, 'open'>;
    notes?: string;
    action?: StandingAction | 'warn';
  },
): Promise<ISafetyIncident> {
  const incident = await SafetyIncident.findById(incidentId);
  if (!incident) throw new NotFoundError('Incident not found');
  if (input.action === 'warn') {
    if (incident.categories.length > 0 && incident.categories.every((c) => c === 'self-harm')) {
      throw new AppError("Someone who may be at risk of self-harm shouldn't get a misuse warning.", 400);
    }
    // Only warn once per incident, even if the review is saved again.
    if (incident.action !== 'warned') await warnLearner(incident);
    incident.action = 'warned';
  } else if (input.action) {
    await setStanding(incident.userId.toString(), input.action, {
      reason: input.notes || `Safety incident ${incident.id}`,
    });
    incident.action = ACTION_RECORDED[input.action];
  }
  incident.status = input.status;
  incident.reviewerId = new Types.ObjectId(reviewerId);
  if (input.notes !== undefined) incident.reviewerNotes = input.notes;
  incident.reviewedAt = new Date();
  await incident.save();
  return incident;
}

// Plain-language reasons for a warning, by category. Shown to the learner.
const WARNING_REASON: Record<SafetyCategory, string> = {
  jailbreak: "trying to get around Trak's rules",
  harassment: 'abusive or harassing language',
  'sexual-minors': 'sexual content involving minors',
  'violent-threat': 'threats of violence',
  'self-harm': 'self-harm',
  'illegal-other': 'asking for help with illegal activity',
};

export function warningReason(categories: SafetyCategory[]): string {
  const reasons = categories.filter((c) => c !== 'self-harm').map((c) => WARNING_REASON[c]);
  return reasons.length ? reasons.join(' and ') : 'misusing Trak';
}

/** Tells the learner about a warning: an email now, and a notice the next time they open TrakCode. */
async function warnLearner(incident: ISafetyIncident): Promise<void> {
  const user = await User.findById(incident.userId);
  if (!user) return; // account already deleted
  const reason = warningReason(incident.categories);
  user.pendingWarning = { incidentId: incident._id as Types.ObjectId, issuedAt: new Date(), flaggedAt: incident.createdAt, reason };
  await user.save();
  const termsLink = `${(env.FRONTEND_URL ?? 'http://localhost:5173').replace(/\/$/, '')}/terms`;
  sendEmail(misuseWarningEmail(user.email, user.name, incident.createdAt, reason, termsLink)).catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[safety] warning email failed', err);
  });
}

/** Every flag on one account, newest first, for reviewing it in context. */
export async function accountHistory(userId: string) {
  const rows = await SafetyIncident.find({ userId })
    .sort({ createdAt: -1 })
    .select('createdAt severity categories status action reviewedAt reviewerNotes message reportedTo')
    .lean();
  return rows.map((r) => ({
    id: r._id.toString(),
    createdAt: r.createdAt,
    severity: r.severity,
    categories: r.categories,
    status: r.status,
    action: r.action,
    reviewedAt: r.reviewedAt ?? null,
    reviewerNotes: r.reviewerNotes ?? null,
    reportedTo: r.reportedTo ?? null,
    message: r.message.length > 160 ? `${r.message.slice(0, 160)}...` : r.message,
  }));
}

/** Records, by hand, that a reviewer reported this incident to an outside party. */
/** Keep (or stop keeping) a record past its normal retention, for a legal matter. */
export async function setLegalHold(incidentId: string, hold: boolean): Promise<ISafetyIncident> {
  const incident = await SafetyIncident.findById(incidentId);
  if (!incident) throw new NotFoundError('Incident not found');
  incident.legalHold = hold;
  await incident.save();
  return incident;
}

export async function recordReport(
  incidentId: string,
  input: { reportedTo: string; reference?: string },
): Promise<ISafetyIncident> {
  const incident = await SafetyIncident.findById(incidentId);
  if (!incident) throw new NotFoundError('Incident not found');
  incident.reportedTo = input.reportedTo;
  incident.reportReference = input.reference;
  incident.reportedAt = new Date();
  await incident.save();
  return incident;
}
