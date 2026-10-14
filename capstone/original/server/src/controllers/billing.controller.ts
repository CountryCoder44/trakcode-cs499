import { NextFunction, RequestHandler, Response } from 'express';
import { z } from 'zod';
import Stripe from 'stripe';
import { getStripeClient } from '../services/stripeClient';
import { User, SubscriptionStatus } from '../models/User';
import { Notification } from '../models/Notification';
import { env } from '../config/env';

function requireStripe(res: Response): ReturnType<typeof getStripeClient> {
  const stripe = getStripeClient();
  if (!stripe) {
    res.status(503).json({ error: 'STRIPE_SECRET_KEY is not configured — billing is unavailable' });
    return null;
  }
  return stripe;
}

// ---- POST /billing/checkout-session ----
const checkoutSchema = z.object({ plan: z.enum(['monthly', 'annual']) });

export const createCheckoutSession: RequestHandler = async (req, res, next) => {
  try {
    const stripe = requireStripe(res);
    if (!stripe) return;

    const { plan } = checkoutSchema.parse(req.body);
    const priceId = plan === 'monthly' ? env.STRIPE_PRICE_ID_MONTHLY : env.STRIPE_PRICE_ID_ANNUAL;
    if (!priceId) {
      res.status(503).json({
        error: `STRIPE_PRICE_ID_${plan === 'monthly' ? 'MONTHLY' : 'ANNUAL'} is not configured`,
      });
      return;
    }

    const user = await User.findById(req.auth!.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (!user.stripeCustomerId) {
      const customer = await stripe.customers.create({ email: user.email, name: user.name, metadata: { userId: user.id } });
      user.stripeCustomerId = customer.id;
      await user.save();
    }

    const frontendUrl = env.FRONTEND_URL ?? 'http://localhost:5173';
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: user.stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${frontendUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/billing`,
      metadata: { userId: user.id },
    });

    res.status(201).json({ url: session.url });
  } catch (err) {
    handleBillingError(err, res, next);
  }
};

// ---- GET /billing/status ----
export const getBillingStatus: RequestHandler = async (req, res, next) => {
  try {
    const user = await User.findById(req.auth!.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // DB-stored status is authoritative and always available — no Stripe
    // dependency required just to read it (kept in sync by the webhook).
    res.json({
      subscriptionStatus: user.subscriptionStatus,
      trialEndsAt: user.trialEndsAt ?? null,
      hasStripeCustomer: Boolean(user.stripeCustomerId),
      hasActiveSubscription: Boolean(user.stripeSubscriptionId),
    });
  } catch (err) {
    next(err);
  }
};

// ---- POST /billing/cancel ----
export const cancelSubscription: RequestHandler = async (req, res, next) => {
  try {
    const stripe = requireStripe(res);
    if (!stripe) return;

    const user = await User.findById(req.auth!.userId);
    if (!user?.stripeSubscriptionId) {
      res.status(400).json({ error: 'No active subscription to cancel' });
      return;
    }

    const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    res.json({
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd: new Date(subscription.items.data[0].current_period_end * 1000),
    });
  } catch (err) {
    handleBillingError(err, res, next);
  }
};

// ---- POST /billing/webhook (Stripe-signed, not user-authed) ----
function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
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
      // 'incomplete' and any future Stripe status we don't explicitly handle —
      // closest analog is "not yet paid", which our schema models as trial.
      return 'trial';
  }
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
        const userId = session.metadata?.userId;
        if (userId && session.subscription) {
          const subscriptionId =
            typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
          await User.findByIdAndUpdate(userId, {
            stripeSubscriptionId: subscriptionId,
            subscriptionStatus: 'active',
          });
          await Notification.create({
            userId,
            type: 'billing',
            message: 'Your TrakCode subscription is now active.',
          });
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
        const user = await User.findOne({ stripeCustomerId: customerId });
        if (user) {
          user.subscriptionStatus = mapStripeStatus(subscription.status);
          await user.save();
          await Notification.create({
            userId: user.id,
            type: 'billing',
            message: `Your subscription status changed to "${user.subscriptionStatus}".`,
          });
        }
        break;
      }
      default:
        break; // Other event types aren't relevant to subscription lifecycle state.
    }
    res.json({ received: true });
  } catch (err) {
    // Non-2xx tells Stripe to retry the webhook per its standard retry schedule.
    res.status(500).json({ error: err instanceof Error ? err.message : 'Webhook handler failed' });
  }
};

function handleBillingError(err: unknown, res: Response, next: NextFunction) {
  if (err instanceof z.ZodError) {
    res.status(400).json({ error: 'Validation failed', details: err.flatten().fieldErrors });
    return;
  }
  next(err);
}
