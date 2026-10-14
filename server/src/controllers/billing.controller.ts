import { RequestHandler, Response } from 'express';
import Stripe from 'stripe';
import { z } from 'zod';
import { getStripeClient } from '../services/stripeClient';
import { User, IUser, SubscriptionStatus } from '../models/User';
import { Notification } from '../models/Notification';
import { env } from '../config/env';
import { TERMS_VERSION, TRAK_PACKS, TRIAL_LENGTH_DAYS } from '../config/constants';
import { TrakPackPurchase } from '../models/TrakPackPurchase';
import { planFor } from '../services/usageLimits.service';
import { enforceOneTrialPerCard } from '../services/trialCards.service';
import { SubscriptionEvent } from '../models/SubscriptionEvent';
import { hasProductAccess } from '../middleware/subscription.middleware';
import { founderWindowEnd, isFounderWindowOpen, markTrialUsed, recordAccountEmail } from '../services/entitlements.service';

// One monthly membership (product name comes from Stripe). The 7-day trial (card up front) runs inside
// Stripe and is offered once per email; founding members get the "forever"
// founder coupon applied at checkout. Changing the card, cancelling and
// invoices all happen in Stripe's hosted Customer Portal.

function requireStripe(res: Response): Stripe | null {
  const stripe = getStripeClient();
  if (!stripe) {
    res.status(503).json({ error: 'Billing is not set up on this server yet.' });
    return null;
  }
  return stripe;
}

function frontendUrl(): string {
  return (env.FRONTEND_URL ?? 'http://localhost:5173').replace(/\/$/, '');
}

const HAS_SUBSCRIPTION: SubscriptionStatus[] = ['trial', 'active', 'past_due'];

// The display price comes from Stripe itself, so the page can never disagree
// with what Checkout charges. Cached for 10 minutes.
interface PriceInfo {
  productName: string;
  amountCents: number;
  currency: string;
  founderPercentOff: number | null;
}
let priceCache: { at: number; value: PriceInfo } | null = null;

async function getPriceInfo(stripe: Stripe): Promise<PriceInfo | null> {
  if (priceCache && Date.now() - priceCache.at < 10 * 60 * 1000) return priceCache.value;
  if (!env.STRIPE_PRICE_ID_MONTHLY) return null;
  const price = await stripe.prices.retrieve(env.STRIPE_PRICE_ID_MONTHLY, { expand: ['product'] });
  const product = price.product as Stripe.Product | Stripe.DeletedProduct;
  let founderPercentOff: number | null = null;
  if (env.STRIPE_FOUNDER_COUPON_ID) {
    const coupon = await stripe.coupons.retrieve(env.STRIPE_FOUNDER_COUPON_ID);
    founderPercentOff = coupon.percent_off;
  }
  const value: PriceInfo = {
    productName: 'name' in product && product.name ? product.name : 'TrakCode',
    amountCents: price.unit_amount ?? 0,
    currency: price.currency,
    founderPercentOff,
  };
  priceCache = { at: Date.now(), value };
  return value;
}

// ---- GET /billing/status ----
export const getBillingStatus: RequestHandler = async (req, res, next) => {
  try {
    const user = await User.findById(req.auth!.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const entitlement = await recordAccountEmail(user.email, user.createdAt);

    const stripe = getStripeClient();
    let price = null;
    if (stripe) {
      try {
        price = await getPriceInfo(stripe);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[billing] could not load price from Stripe', err);
      }
    }

    const windowEnd = founderWindowEnd();
    res.json({
      subscriptionStatus: user.subscriptionStatus,
      hasAccess: hasProductAccess(user),
      hasSubscription: HAS_SUBSCRIPTION.includes(user.subscriptionStatus) && Boolean(user.stripeSubscriptionId),
      trialEndsAt: user.trialEndsAt ?? null,
      currentPeriodEnd: user.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: Boolean(user.cancelAtPeriodEnd),
      trialAvailable: !entitlement.trialUsedAt,
      // Set when a trial was refused because the card had already had one.
      trialDeniedReason: user.trialDeniedReason ?? null,
      trialDays: TRIAL_LENGTH_DAYS,
      foundingMember: entitlement.foundingMember,
      founderWindowOpen: isFounderWindowOpen(),
      founderWindowEndsAt: windowEnd,
      price, // null until Stripe is configured
      trakPacks: TRAK_PACKS,
      billingConfigured: Boolean(stripe && env.STRIPE_PRICE_ID_MONTHLY),
    });
  } catch (err) {
    next(err);
  }
};

// ---- POST /billing/checkout-session ----
export const createCheckoutSession: RequestHandler = async (req, res, next) => {
  try {
    const stripe = requireStripe(res);
    if (!stripe) return;
    if (!env.STRIPE_PRICE_ID_MONTHLY) {
      res.status(503).json({ error: 'Billing is not set up on this server yet.' });
      return;
    }

    const user = await User.findById(req.auth!.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    // Age (18+) and Terms/Privacy acceptance, ticked right above the button.
    if (req.body?.acceptTerms !== true) {
      res.status(400).json({
        error: 'Please confirm you are at least 18 and agree to the Terms of Service and Privacy Policy.',
        details: { code: 'TERMS_NOT_ACCEPTED' },
      });
      return;
    }
    if (HAS_SUBSCRIPTION.includes(user.subscriptionStatus) && user.stripeSubscriptionId) {
      res.status(409).json({ error: 'You already have a subscription. Use "Manage subscription" to change it.' });
      return;
    }

    user.termsAcceptedAt = new Date();
    user.termsVersion = TERMS_VERSION;
    // Subscribing again calls off a pending "delete my account".
    user.deletionScheduledFor = undefined;
    // A new checkout replaces any earlier "trial refused" notice.
    user.set('trialDeniedReason', undefined);
    await user.save();

    const entitlement = await recordAccountEmail(user.email, user.createdAt);
    // The consent record outlives the account (Privacy Policy §6: billing records).
    entitlement.termsAcceptedAt = user.termsAcceptedAt;
    entitlement.termsVersion = TERMS_VERSION;
    await entitlement.save();
    if (entitlement.foundingMember && !env.STRIPE_FOUNDER_COUPON_ID) {
      // Never charge a founding member full price because of a missing setting.
      // eslint-disable-next-line no-console
      console.error('[billing] founding member checkout blocked: STRIPE_FOUNDER_COUPON_ID is not set');
      res.status(503).json({ error: 'Billing is being set up. Please try again shortly.' });
      return;
    }

    if (!user.stripeCustomerId) {
      const customer = await stripe.customers.create({ email: user.email, name: user.name, metadata: { userId: user.id } });
      user.stripeCustomerId = customer.id;
      await user.save();
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: user.stripeCustomerId,
      ...taxOptions(),
      line_items: [{ price: env.STRIPE_PRICE_ID_MONTHLY, quantity: 1 }],
      // Card up front, even when today's charge is $0 because of the trial.
      payment_method_collection: 'always',
      subscription_data: {
        metadata: { userId: user.id },
        ...(entitlement.trialUsedAt ? {} : { trial_period_days: TRIAL_LENGTH_DAYS }),
      },
      ...(entitlement.foundingMember ? { discounts: [{ coupon: env.STRIPE_FOUNDER_COUPON_ID }] } : {}),
      success_url: `${frontendUrl()}/billing?checkout=success`,
      cancel_url: `${frontendUrl()}/billing`,
      metadata: { userId: user.id },
    });

    res.status(201).json({ url: session.url });
  } catch (err) {
    next(err);
  }
};

// ---- POST /billing/portal-session ----
// Stripe's hosted page for updating the card, cancelling, and invoices.
export const createPortalSession: RequestHandler = async (req, res, next) => {
  try {
    const stripe = requireStripe(res);
    if (!stripe) return;
    const user = await User.findById(req.auth!.userId);
    if (!user?.stripeCustomerId) {
      res.status(400).json({ error: 'There is no billing account to manage yet.' });
      return;
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${frontendUrl()}/billing`,
    });
    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
};

// ---- POST /billing/trak-pack ----
// Tutoring packs: extra Trak questions, paid immediately in Stripe Checkout
// (one-time payment, no subscription change). Members only: trial learners are
// pointed to starting their membership instead. No discounts: the founding
// coupon isn't applied and promotion codes are off. Questions are credited by
// the webhook once Stripe confirms payment (creditTrakPack).
const trakPackSchema = z.object({ packId: z.enum(TRAK_PACKS.map((p) => p.id) as [string, ...string[]]) });

export const createTrakPackCheckout: RequestHandler = async (req, res, next) => {
  try {
    const stripe = requireStripe(res);
    if (!stripe) return;
    const { packId } = trakPackSchema.parse(req.body);
    const pack = TRAK_PACKS.find((p) => p.id === packId)!;
    const user = await User.findById(req.auth!.userId);
    if (!user) {
      res.status(401).json({ error: 'Invalid session' });
      return;
    }
    if (planFor(user) !== 'member') {
      res.status(403).json({
        error: 'Tutoring packs are for members. Start your membership to add Trak questions.',
        details: { code: 'MEMBERS_ONLY' },
      });
      return;
    }
    if (!user.stripeCustomerId) {
      const customer = await stripe.customers.create({ email: user.email, name: user.name, metadata: { userId: user.id } });
      user.stripeCustomerId = customer.id;
      await user.save();
    }
    const metadata = { kind: 'trak-pack', userId: user.id, packId: pack.id, questions: String(pack.questions) };
    const priceId = packPriceId(pack.id);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: user.stripeCustomerId,
      ...taxOptions(),
      line_items: [
        priceId
          ? { quantity: 1, price: priceId }
          : {
              quantity: 1,
              price_data: {
                currency: 'usd',
                unit_amount: pack.priceCents,
                product_data: {
                  name: `Tutoring pack: ${pack.questions} Trak questions`,
                  description: 'Used after your weekly Trak questions run out. Never expire.',
                },
              },
            },
      ],
      allow_promotion_codes: false,
      payment_intent_data: { metadata, description: `TrakCode tutoring pack (${pack.questions} Trak questions)` },
      metadata,
      success_url: `${frontendUrl()}/billing?pack=success`,
      cancel_url: `${frontendUrl()}/billing`,
    });
    res.status(201).json({ url: session.url });
  } catch (err) {
    next(err);
  }
};

/**
 * Adds a paid pack's questions to the learner. Safe to call more than once for
 * the same Checkout session (Stripe retries webhooks): the purchase row's unique
 * session id means only the first call credits anything.
 */
export async function creditTrakPack(session: Stripe.Checkout.Session): Promise<boolean> {
  if (session.mode !== 'payment' || session.metadata?.kind !== 'trak-pack' || session.payment_status !== 'paid') return false;
  const pack = TRAK_PACKS.find((p) => p.id === session.metadata?.packId);
  const userId = session.metadata?.userId;
  if (!pack || !userId) return false;
  try {
    await TrakPackPurchase.create({
      userId,
      stripeSessionId: session.id,
      packId: pack.id,
      questions: pack.questions,
      remaining: pack.questions,
      amountCents: session.amount_total ?? pack.priceCents,
    });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) return false; // already credited
    throw err;
  }
  await User.updateOne({ _id: userId }, { $inc: { bonusTrakQuestions: pack.questions } });
  await Notification.create({
    userId,
    type: 'billing',
    message: `${pack.questions} Trak questions were added to your account. They're used after your weekly questions run out and never expire.`,
  });
  return true;
}

// ---- POST /billing/start-membership ----
// "Skip the free trial": ends the Stripe trial now, which bills the first month
// immediately and unlocks full allowances. `error_if_incomplete` makes Stripe
// refuse the change if the card is declined, so a failed payment leaves the
// learner on their trial rather than half-converted.
export const startMembershipNow: RequestHandler = async (req, res, next) => {
  try {
    const stripe = requireStripe(res);
    if (!stripe) return;
    const user = await User.findById(req.auth!.userId);
    if (!user?.stripeSubscriptionId || user.subscriptionStatus !== 'trial') {
      res.status(400).json({ error: 'This is only available during the free trial.' });
      return;
    }
    let sub: Stripe.Subscription;
    try {
      sub = await stripe.subscriptions.update(user.stripeSubscriptionId, {
        trial_end: 'now',
        payment_behavior: 'error_if_incomplete',
      });
    } catch (err) {
      if ((err as { type?: string }).type === 'StripeCardError') {
        res.status(402).json({
          error: "Your card was declined, so your membership didn't start. You're still on your free trial. You can update your card under Manage subscription.",
        });
        return;
      }
      throw err;
    }
    await syncSubscription(sub);
    const updated = await User.findById(user.id);
    res.json({ subscriptionStatus: updated?.subscriptionStatus ?? 'active' });
  } catch (err) {
    next(err);
  }
};

// ---- POST /billing/bypass-trial ----
// Capstone build only: Stripe is not configured, so this stands in for checkout.
// It gives the account the same free trial a real checkout would (status
// 'trial' for TRIAL_LENGTH_DAYS), with no payment details. The paywall and the
// trial allowances then apply exactly as they do for a real trial.
export const startBypassTrial: RequestHandler = async (req, res, next) => {
  try {
    const user = await User.findById(req.auth!.userId);
    if (!user) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
    if (hasProductAccess(user)) {
      res.status(409).json({ error: 'This account already has access.' });
      return;
    }
    const previous = user.subscriptionStatus;
    user.subscriptionStatus = 'trial';
    user.trialEndsAt = new Date(Date.now() + TRIAL_LENGTH_DAYS * 24 * 60 * 60 * 1000);
    await user.save();
    await SubscriptionEvent.create({ userId: user._id, from: previous, to: 'trial', reason: 'capstone-bypass' });
    await Notification.create({
      userId: user._id,
      type: 'billing',
      message: `Your ${TRIAL_LENGTH_DAYS}-day free trial has started. Welcome to TrakCode!`,
    });
    res.json({ subscriptionStatus: user.subscriptionStatus, trialEndsAt: user.trialEndsAt });
  } catch (err) {
    next(err);
  }
};

/** The Stripe price for a tutoring pack, when one is configured. */
function packPriceId(packId: string): string | undefined {
  const ids: Record<string, string | undefined> = {
    'pack-50': env.STRIPE_PRICE_ID_PACK_50,
    'pack-150': env.STRIPE_PRICE_ID_PACK_150,
    'pack-400': env.STRIPE_PRICE_ID_PACK_400,
  };
  return ids[packId];
}

/**
 * Stripe Tax at Checkout (when STRIPE_AUTOMATIC_TAX is on): tax is worked out
 * from the buyer's billing address, which Checkout collects and saves on the
 * customer. Prices are tax-exclusive in USD, so tax is added on top where it
 * applies.
 */
function taxOptions(): Pick<
  Stripe.Checkout.SessionCreateParams,
  'automatic_tax' | 'customer_update' | 'billing_address_collection'
> {
  if (!env.STRIPE_AUTOMATIC_TAX) return {};
  return {
    automatic_tax: { enabled: true },
    billing_address_collection: 'auto',
    customer_update: { address: 'auto', name: 'auto' },
  };
}

// ---- GET /billing/founding (no sign-in) ----
// When the founding-member period ends, for the public Pricing page. null while
// no launch date is set (the period is open).
export const getFoundingPeriod: RequestHandler = (_req, res) => {
  const end = founderWindowEnd();
  // The window closes at 00:00 Eastern on the 1st; its last day is the day before.
  const lastDay = end ? new Date(end.getTime() - 24 * 60 * 60 * 1000) : null;
  res.json({ open: isFounderWindowOpen(), endsAt: end, lastDay });
};

// ---- Trial cancellation ----
// Cancelling during the free trial ends the subscription (and access)
// immediately, with no charge. Learners cancel in Stripe's Customer Portal,
// which can only schedule a cancel for the end of the trial, so the webhook
// turns that into an immediate one. Paid subscriptions still cancel at the end
// of the period they've paid for.
export function isCancelledTrial(sub: Stripe.Subscription): boolean {
  return sub.status === 'trialing' && Boolean(sub.cancel_at_period_end || sub.cancel_at);
}

async function endTrialNow(stripe: Stripe, subscriptionId: string): Promise<void> {
  try {
    await stripe.subscriptions.cancel(subscriptionId);
  } catch (err) {
    // Already cancelled (e.g. a retried webhook) is fine; anything else isn't.
    const code = (err as { code?: string }).code;
    if (code !== 'resource_missing' && !String((err as Error).message).includes('canceled')) throw err;
  }
}

// ---- POST /billing/webhook (Stripe-signed, not user-authed) ----
export function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trial';
    case 'past_due':
      return 'past_due';
    case 'canceled':
    case 'incomplete_expired':
    case 'unpaid':
    case 'paused':
      return 'canceled';
    default:
      // 'incomplete' (first payment not done) and anything new: no access yet.
      return 'none';
  }
}

async function findUserForSubscription(sub: Stripe.Subscription): Promise<IUser | null> {
  const userId = sub.metadata?.userId;
  if (userId) {
    const byId = await User.findById(userId);
    if (byId) return byId;
  }
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  return User.findOne({ stripeCustomerId: customerId });
}

/** Copies a subscription's state onto its user. Returns the user, or null if unknown. */
export async function syncSubscription(sub: Stripe.Subscription, deleted = false): Promise<IUser | null> {
  const user = await findUserForSubscription(sub);
  if (!user) return null;

  // A webhook for an older, replaced subscription must not overwrite the current one.
  if (user.stripeSubscriptionId && user.stripeSubscriptionId !== sub.id && !deleted && sub.status !== 'active' && sub.status !== 'trialing') {
    return user;
  }
  if (deleted && user.stripeSubscriptionId && user.stripeSubscriptionId !== sub.id) return user;

  // One atomic update that also hands back the state it replaced. Stripe sends
  // several events for one change (e.g. checkout.session.completed and
  // customer.subscription.created together); when they're processed at the same
  // time, only the first sees the old status, so a transition notifies once.
  const nextStatus: SubscriptionStatus = deleted ? 'canceled' : mapStripeStatus(sub.status);
  const periodEnd = sub.items?.data?.[0]?.current_period_end;
  const set: Record<string, unknown> = {
    subscriptionStatus: nextStatus,
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end || sub.cancel_at),
  };
  const unset: Record<string, ''> = {};
  // A cancelled subscription never stays attached, even when its "cancelled"
  // arrives as an update rather than a delete.
  if (deleted || nextStatus === 'canceled') unset.stripeSubscriptionId = '';
  else set.stripeSubscriptionId = sub.id;
  // A paid membership clears any old "trial refused" notice.
  if (nextStatus === 'active') unset.trialDeniedReason = '';
  if (sub.trial_end) set.trialEndsAt = new Date(sub.trial_end * 1000);
  else unset.trialEndsAt = '';
  if (periodEnd) set.currentPeriodEnd = new Date(periodEnd * 1000);
  else unset.currentPeriodEnd = '';
  if (!user.stripeCustomerId) set.stripeCustomerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;

  const before = await User.findOneAndUpdate(
    { _id: user._id },
    { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
    { new: false }
  );
  const previous = before?.subscriptionStatus ?? user.subscriptionStatus;
  const updated = (await User.findById(user._id)) ?? user;

  if (sub.trial_end) {
    // Make sure the email has a record first: a subscription created outside our
    // checkout (e.g. by hand in the Stripe dashboard) wouldn't have one yet.
    await recordAccountEmail(user.email, user.createdAt);
    await markTrialUsed(user.email);
  }

  if (previous !== nextStatus) {
    // Growth tracking (Admin, Growth): every status change, with why a trial
    // was refused when that's the reason.
    await SubscriptionEvent.create({
      userId: user._id,
      from: previous,
      to: nextStatus,
      reason: updated.trialDeniedReason ?? undefined,
    });
    const messages: Partial<Record<SubscriptionStatus, string>> = {
      trial: `Your ${TRIAL_LENGTH_DAYS}-day free trial has started. Welcome to TrakCode!`,
      active: 'Your TrakCode membership is active.',
      past_due: "We couldn't charge your card. Update it in Billing to keep your access.",
      canceled: 'Your TrakCode membership has ended.',
    };
    const message =
      previous === 'trial' && nextStatus === 'canceled'
        ? 'Your free trial was cancelled and your access has ended. You can subscribe anytime from Billing.'
        : messages[nextStatus];
    if (message) await Notification.create({ userId: user.id, type: 'billing', message });
  }
  return updated;
}

export const handleWebhook: RequestHandler = async (req, res) => {
  const stripe = getStripeClient();
  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
    res.status(503).json({ error: 'Stripe webhook is not configured' });
    return;
  }

  const signature = req.headers['stripe-signature'];
  if (!signature || typeof signature !== 'string') {
    res.status(400).json({ error: 'Missing Stripe-Signature header' });
    return;
  }

  let event: Stripe.Event;
  try {
    // req.body must be the raw, unparsed request body (Buffer) for signature
    // verification — see the dedicated express.raw() route wiring in app.ts.
    event = stripe.webhooks.constructEvent(req.body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    res.status(400).json({
      error: `Webhook signature verification failed: ${err instanceof Error ? err.message : String(err)}`,
    });
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'payment') {
          await creditTrakPack(session);
        } else if (session.mode === 'subscription' && session.subscription) {
          const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
          const sub = await stripe.subscriptions.retrieve(subId);
          await syncSubscription(sub);
          // One free trial per card: a card already used for another email's trial is refused.
          if (await enforceOneTrialPerCard(stripe, sub, (id) => endTrialNow(stripe, id))) {
            await syncSubscription(await stripe.subscriptions.retrieve(subId), true);
          }
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        if (isCancelledTrial(sub)) {
          // Product rule: cancelling during the free trial ends access right away
          // (e.g. a cancel made in Stripe's Customer Portal, which can only
          // schedule it for the end of the trial).
          await endTrialNow(stripe, sub.id);
          await syncSubscription(sub, true);
        } else {
          await syncSubscription(sub);
        }
        break;
      }
      case 'customer.subscription.deleted':
        await syncSubscription(event.data.object as Stripe.Subscription, true);
        break;
      default:
        break; // Payment failures arrive as customer.subscription.updated (status past_due).
    }
    res.json({ received: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[billing] webhook handler failed', event.type, err);
    // Non-2xx tells Stripe to retry the webhook per its standard retry schedule.
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};
