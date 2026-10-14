// Billing end to end through the real Express app and a real ephemeral mongod.
// Stripe is a real SDK instance with its network methods stubbed, so webhook
// signatures are genuinely signed and verified.
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Stripe from 'stripe';
import { env } from '../config/env';
import { User } from '../models/User';
import { EmailEntitlement } from '../models/EmailEntitlement';
import { Notification } from '../models/Notification';
import { signToken } from '../utils/jwt';
import { TERMS_VERSION } from '../config/constants';

const stripe = new Stripe('sk_test_dummy');
jest.mock('../services/stripeClient', () => ({ getStripeClient: () => stripe }));

// eslint-disable-next-line import/first
import { createApp } from '../app';

const WEBHOOK_SECRET = 'whsec_test_secret';
let mem: MongoMemoryServer;
const app = createApp();

const createSession = jest.fn();
const retrieveSub = jest.fn();
const cancelSub = jest.fn();

beforeAll(async () => {
  mem = await MongoMemoryServer.create({ instance: { dbName: 'billing_test' } });
  await mongoose.connect(mem.getUri('billing_test'));
  env.STRIPE_SECRET_KEY = 'sk_test_dummy';
  env.STRIPE_PRICE_ID_MONTHLY = 'price_monthly';
  env.STRIPE_FOUNDER_COUPON_ID = 'FOUNDING20';
  env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
  env.FOUNDER_LAUNCH_DATE = undefined; // window open
  env.FRONTEND_URL = 'https://trakcode.test';

  jest.spyOn(stripe.customers, 'create').mockResolvedValue({ id: 'cus_123' } as Stripe.Response<Stripe.Customer>);
  jest.spyOn(stripe.checkout.sessions, 'create').mockImplementation(createSession);
  jest.spyOn(stripe.subscriptions, 'retrieve').mockImplementation(retrieveSub);
  jest.spyOn(stripe.subscriptions, 'cancel').mockImplementation(cancelSub);
  jest
    .spyOn(stripe.prices, 'retrieve')
    .mockResolvedValue({ unit_amount: 2499, currency: 'usd', product: { id: 'prod_1', name: 'TrakCode' } } as never);
  jest.spyOn(stripe.coupons, 'retrieve').mockResolvedValue({ percent_off: 20 } as never);
  jest
    .spyOn(stripe.billingPortal.sessions, 'create')
    .mockResolvedValue({ url: 'https://billing.stripe.test/p/session' } as never);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mem.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await EmailEntitlement.deleteMany({});
  await Notification.deleteMany({});
  createSession.mockReset().mockResolvedValue({ url: 'https://checkout.stripe.test/s' });
  retrieveSub.mockReset();
  cancelSub.mockReset().mockResolvedValue({});
  env.STRIPE_FOUNDER_COUPON_ID = 'FOUNDING20';
});

async function newUser(overrides: Record<string, unknown> = {}) {
  const user = await User.create({ email: 'ada@example.com', name: 'Ada', subscriptionStatus: 'none', emailVerified: true, ...overrides });
  return { user, auth: `Bearer ${signToken({ userId: user.id, role: 'user' })}` };
}

function subscription(overrides: Partial<Stripe.Subscription> = {}): Stripe.Subscription {
  return {
    id: 'sub_1',
    object: 'subscription',
    customer: 'cus_123',
    status: 'trialing',
    trial_end: Math.floor(Date.now() / 1000) + 7 * 86400,
    cancel_at_period_end: false,
    cancel_at: null,
    metadata: {},
    items: { data: [{ current_period_end: Math.floor(Date.now() / 1000) + 7 * 86400 }] },
    ...overrides,
  } as unknown as Stripe.Subscription;
}

function signedWebhook(event: object) {
  const payload = JSON.stringify(event);
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET });
  return request(app)
    .post('/api/billing/webhook')
    .set('Stripe-Signature', header)
    .set('Content-Type', 'application/json')
    .send(payload);
}

describe('paywall', () => {
  it('sends a new account without a subscription to billing (402)', async () => {
    const { auth } = await newUser();
    const res = await request(app).get('/api/seq/topics?course=python').set('Authorization', auth);
    expect(res.status).toBe(402);
    expect(res.body.details.code).toBe('SUBSCRIPTION_REQUIRED');
  });

  it('still answers 401, not 402, without a token', async () => {
    const res = await request(app).get('/api/seq/topics?course=python');
    expect(res.status).toBe(401);
  });

  it('lets trialing, active, past-due, demo and admin accounts through', async () => {
    const future = new Date(Date.now() + 86400000);
    for (const [i, extra] of [
      { subscriptionStatus: 'trial', trialEndsAt: future },
      { subscriptionStatus: 'active' },
      { subscriptionStatus: 'past_due' },
      { subscriptionStatus: 'demo' },
      { subscriptionStatus: 'none', role: 'admin' },
    ].entries()) {
      const { auth } = await newUser({ email: `u${i}@example.com`, ...extra });
      const res = await request(app).get('/api/seq/topics?course=python').set('Authorization', auth);
      expect(res.status).toBe(200);
    }
  });

  it('blocks an expired trial and a canceled plan', async () => {
    for (const [i, extra] of [
      { subscriptionStatus: 'trial', trialEndsAt: new Date(Date.now() - 3 * 60 * 60 * 1000) },
      { subscriptionStatus: 'canceled' },
    ].entries()) {
      const { auth } = await newUser({ email: `x${i}@example.com`, ...extra });
      const res = await request(app).get('/api/seq/topics?course=python').set('Authorization', auth);
      expect(res.status).toBe(402);
    }
  });

  it('keeps billing and profile reachable without a plan', async () => {
    const { auth } = await newUser();
    expect((await request(app).get('/api/billing/status').set('Authorization', auth)).status).toBe(200);
    expect((await request(app).get('/api/auth/me').set('Authorization', auth)).status).toBe(200);
  });
});

describe('checkout', () => {
  it('offers the 7-day trial with a card and applies the founder coupon', async () => {
    const { auth } = await newUser();
    const res = await request(app).post('/api/billing/checkout-session').set('Authorization', auth).send({ acceptTerms: true });
    expect(res.status).toBe(201);
    const params = createSession.mock.calls[0][0];
    expect(params.payment_method_collection).toBe('always');
    expect(params.subscription_data.trial_period_days).toBe(7);
    expect(params.discounts).toEqual([{ coupon: 'FOUNDING20' }]);
    expect(params.line_items).toEqual([{ price: 'price_monthly', quantity: 1 }]);
  });

  it('skips the trial for an email that already had one, and the coupon for non-founders', async () => {
    await EmailEntitlement.create({
      emailKey: 'ada@example.com',
      email: 'ada@example.com',
      firstSeenAt: new Date('2020-01-01'),
      foundingMember: false,
      trialUsedAt: new Date('2020-01-02'),
    });
    env.FOUNDER_LAUNCH_DATE = '2019-01-01'; // window long closed
    const { auth } = await newUser();
    await request(app).post('/api/billing/checkout-session').set('Authorization', auth).send({ acceptTerms: true });
    env.FOUNDER_LAUNCH_DATE = undefined;
    const params = createSession.mock.calls[0][0];
    expect(params.subscription_data.trial_period_days).toBeUndefined();
    expect(params.discounts).toBeUndefined();
  });

  it('a founding member who leaves (even deleting their account) and returns after the window still gets 20% off', async () => {
    // Joined while the window was open.
    const first = await newUser();
    await request(app).post('/api/billing/checkout-session').set('Authorization', first.auth).send({ acceptTerms: true });
    expect(createSession.mock.calls[0][0].discounts).toEqual([{ coupon: 'FOUNDING20' }]);

    // Account deleted; the window has long since closed; they sign up again
    // with a dotted/+tag variant of the same Gmail-style address.
    await User.deleteMany({});
    env.FOUNDER_LAUNCH_DATE = '2019-01-01';
    const back = await newUser({ email: 'ada+again@example.com' });
    await request(app).post('/api/billing/checkout-session').set('Authorization', back.auth).send({ acceptTerms: true });
    env.FOUNDER_LAUNCH_DATE = undefined;
    expect(createSession.mock.calls[1][0].discounts).toEqual([{ coupon: 'FOUNDING20' }]);
  });

  it('refuses to charge a founding member full price if the coupon is not configured', async () => {
    env.STRIPE_FOUNDER_COUPON_ID = undefined;
    const { auth } = await newUser();
    const res = await request(app).post('/api/billing/checkout-session').set('Authorization', auth).send({ acceptTerms: true });
    expect(res.status).toBe(503);
    expect(createSession).not.toHaveBeenCalled();
  });

  it('refuses a second subscription', async () => {
    const { auth } = await newUser({ subscriptionStatus: 'active', stripeSubscriptionId: 'sub_9' });
    const res = await request(app).post('/api/billing/checkout-session').set('Authorization', auth).send({ acceptTerms: true });
    expect(res.status).toBe(409);
  });

  it('requires the 13+ / Terms checkbox, and records when and which version was accepted', async () => {
    const { auth, user } = await newUser();
    const without = await request(app).post('/api/billing/checkout-session').set('Authorization', auth);
    expect(without.status).toBe(400);
    expect(without.body.details.code).toBe('TERMS_NOT_ACCEPTED');
    expect(createSession).not.toHaveBeenCalled();

    const ok = await request(app).post('/api/billing/checkout-session').set('Authorization', auth).send({ acceptTerms: true });
    expect(ok.status).toBe(201);
    const saved = await User.findById(user.id);
    expect(saved!.termsAcceptedAt).toBeInstanceOf(Date);
    expect(saved!.termsVersion).toBe(TERMS_VERSION);
  });
});

describe('webhook', () => {
  it('rejects an unsigned request', async () => {
    const res = await request(app).post('/api/billing/webhook').set('Content-Type', 'application/json').send('{}');
    expect(res.status).toBe(400);
  });

  it('starts the trial when checkout completes and marks the trial used', async () => {
    const { user } = await newUser({ stripeCustomerId: 'cus_123' });
    retrieveSub.mockResolvedValue(subscription({ metadata: { userId: user.id } }));

    const res = await signedWebhook({
      id: 'evt_1',
      type: 'checkout.session.completed',
      data: { object: { object: 'checkout.session', mode: 'subscription', subscription: 'sub_1', metadata: { userId: user.id } } },
    });
    expect(res.status).toBe(200);

    const reloaded = await User.findById(user.id);
    expect(reloaded!.subscriptionStatus).toBe('trial');
    expect(reloaded!.stripeSubscriptionId).toBe('sub_1');
    expect(reloaded!.trialEndsAt!.getTime()).toBeGreaterThan(Date.now());
    expect((await EmailEntitlement.findOne({ emailKey: 'ada@example.com' }))!.trialUsedAt).toBeTruthy();
  });

  it('moves to active, then past due, then canceled as Stripe reports it', async () => {
    const { user } = await newUser({ stripeCustomerId: 'cus_123', stripeSubscriptionId: 'sub_1', subscriptionStatus: 'trial' });
    for (const [status, expected] of [
      ['active', 'active'],
      ['past_due', 'past_due'],
    ] as const) {
      await signedWebhook({ id: `evt_${status}`, type: 'customer.subscription.updated', data: { object: subscription({ status, trial_end: null }) } });
      expect((await User.findById(user.id))!.subscriptionStatus).toBe(expected);
    }
    await signedWebhook({ id: 'evt_del', type: 'customer.subscription.deleted', data: { object: subscription({ status: 'canceled', trial_end: null }) } });
    const ended = await User.findById(user.id);
    expect(ended!.subscriptionStatus).toBe('canceled');
    expect(ended!.stripeSubscriptionId).toBeUndefined();
  });

  it('records a pending cancellation for the billing page', async () => {
    const { user } = await newUser({ stripeCustomerId: 'cus_123', stripeSubscriptionId: 'sub_1', subscriptionStatus: 'active' });
    await signedWebhook({ id: 'evt_c', type: 'customer.subscription.updated', data: { object: subscription({ status: 'active', trial_end: null, cancel_at_period_end: true }) } });
    expect((await User.findById(user.id))!.cancelAtPeriodEnd).toBe(true);
  });
});

describe('cancelling during the free trial', () => {
  it('ends a trial immediately when it is cancelled in the Customer Portal', async () => {
    const { user } = await newUser({
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'sub_1',
      subscriptionStatus: 'trial',
      trialEndsAt: new Date(Date.now() + 5 * 86400000),
    });
    // The portal can only schedule the cancel for the end of the trial.
    await signedWebhook({
      id: 'evt_trial_cancel',
      type: 'customer.subscription.updated',
      data: { object: subscription({ status: 'trialing', cancel_at: Math.floor(Date.now() / 1000) + 5 * 86400 }) },
    });
    expect(cancelSub).toHaveBeenCalledWith('sub_1');
    const reloaded = await User.findById(user.id);
    expect(reloaded!.subscriptionStatus).toBe('canceled');
    expect(reloaded!.stripeSubscriptionId).toBeUndefined();
  });

  it('does not cut off a paid subscription that is set to cancel at period end', async () => {
    const { user } = await newUser({ stripeCustomerId: 'cus_123', stripeSubscriptionId: 'sub_1', subscriptionStatus: 'active' });
    await signedWebhook({
      id: 'evt_paid_cancel',
      type: 'customer.subscription.updated',
      data: { object: subscription({ status: 'active', trial_end: null, cancel_at_period_end: true }) },
    });
    expect(cancelSub).not.toHaveBeenCalled();
    expect((await User.findById(user.id))!.subscriptionStatus).toBe('active');
  });
});

describe('billing status and portal', () => {
  it('reports the plan name, price, founder discount and trial availability from Stripe', async () => {
    const { auth } = await newUser();
    const res = await request(app).get('/api/billing/status').set('Authorization', auth);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      subscriptionStatus: 'none',
      hasAccess: false,
      hasSubscription: false,
      trialAvailable: true,
      trialDays: 7,
      foundingMember: true,
      billingConfigured: true,
      price: { productName: 'TrakCode', amountCents: 2499, currency: 'usd', founderPercentOff: 20 },
    });
  });

  it('stops offering the trial once the email has used it', async () => {
    const { auth } = await newUser();
    await request(app).get('/api/billing/status').set('Authorization', auth); // creates the record
    await EmailEntitlement.updateOne({ emailKey: 'ada@example.com' }, { $set: { trialUsedAt: new Date() } });
    const res = await request(app).get('/api/billing/status').set('Authorization', auth);
    expect(res.body.trialAvailable).toBe(false);
  });

  it('opens the Customer Portal only for an account with a billing record', async () => {
    const without = await newUser({ email: 'nobody@example.com' });
    expect((await request(app).post('/api/billing/portal-session').set('Authorization', without.auth)).status).toBe(400);
    const withCustomer = await newUser({ email: 'payer@example.com', stripeCustomerId: 'cus_123' });
    const res = await request(app).post('/api/billing/portal-session').set('Authorization', withCustomer.auth);
    expect(res.status).toBe(200);
    expect(res.body.url).toBe('https://billing.stripe.test/p/session');
  });
});

describe('webhook robustness', () => {
  it('sends the "trial started" notification once even when Stripe events arrive together', async () => {
    const { user } = await newUser({ stripeCustomerId: 'cus_123' });
    retrieveSub.mockResolvedValue(subscription({ metadata: { userId: user.id } }));
    await Promise.all([
      signedWebhook({
        id: 'evt_a',
        type: 'checkout.session.completed',
        data: { object: { object: 'checkout.session', mode: 'subscription', subscription: 'sub_1' } },
      }),
      signedWebhook({ id: 'evt_b', type: 'customer.subscription.created', data: { object: subscription({ metadata: { userId: user.id } }) } }),
      signedWebhook({ id: 'evt_c', type: 'customer.subscription.updated', data: { object: subscription({ metadata: { userId: user.id } }) } }),
    ]);
    expect((await User.findById(user.id))!.subscriptionStatus).toBe('trial');
    expect(await Notification.countDocuments({ userId: user._id, type: 'billing' })).toBe(1);
  });

  it('ignores a late event about an older subscription', async () => {
    const { user } = await newUser({ stripeCustomerId: 'cus_123', stripeSubscriptionId: 'sub_new', subscriptionStatus: 'active' });
    await signedWebhook({ id: 'evt_old_del', type: 'customer.subscription.deleted', data: { object: subscription({ id: 'sub_old', status: 'canceled' }) } });
    await signedWebhook({ id: 'evt_old_upd', type: 'customer.subscription.updated', data: { object: subscription({ id: 'sub_old', status: 'canceled' }) } });
    const reloaded = await User.findById(user.id);
    expect(reloaded!.subscriptionStatus).toBe('active');
    expect(reloaded!.stripeSubscriptionId).toBe('sub_new');
  });

  it('does not grant access for a subscription whose first payment never completed', async () => {
    const { user, auth } = await newUser({ stripeCustomerId: 'cus_123' });
    await signedWebhook({ id: 'evt_inc', type: 'customer.subscription.created', data: { object: subscription({ status: 'incomplete', trial_end: null }) } });
    expect((await User.findById(user.id))!.subscriptionStatus).toBe('none');
    expect((await request(app).get('/api/seq/topics?course=python').set('Authorization', auth)).status).toBe(402);
  });

  it('detaches a subscription that is reported cancelled through an update', async () => {
    const { user } = await newUser({ stripeCustomerId: 'cus_123', stripeSubscriptionId: 'sub_1', subscriptionStatus: 'active' });
    await signedWebhook({ id: 'evt_upd_cancel', type: 'customer.subscription.updated', data: { object: subscription({ status: 'canceled', trial_end: null }) } });
    const reloaded = await User.findById(user.id);
    expect(reloaded!.subscriptionStatus).toBe('canceled');
    expect(reloaded!.stripeSubscriptionId).toBeUndefined();
  });

  it('acknowledges event types it does not handle', async () => {
    const res = await signedWebhook({ id: 'evt_other', type: 'charge.refunded', data: { object: { object: 'charge' } } });
    expect(res.status).toBe(200);
  });
});

describe('trial end grace period', () => {
  it('keeps access briefly after the trial ends while Stripe catches up', async () => {
    const { auth } = await newUser({ subscriptionStatus: 'trial', trialEndsAt: new Date(Date.now() - 30 * 60 * 1000) });
    expect((await request(app).get('/api/seq/topics?course=python').set('Authorization', auth)).status).toBe(200);
  });
});

describe('POST /billing/bypass-trial (capstone build)', () => {
  it('gives an account with no access a free trial and opens the paywall', async () => {
    const { user, auth } = await newUser();
    expect((await request(app).get('/api/seq/topics?course=python').set('Authorization', auth)).status).toBe(402);

    const res = await request(app).post('/api/billing/bypass-trial').set('Authorization', auth);
    expect(res.status).toBe(200);
    expect(res.body.subscriptionStatus).toBe('trial');
    const saved = await User.findById(user.id);
    const days = (saved!.trialEndsAt!.getTime() - Date.now()) / 86400000;
    expect(days).toBeGreaterThan(6.9);
    expect(days).toBeLessThanOrEqual(7);
    expect(createSession).not.toHaveBeenCalled();

    expect((await request(app).get('/api/seq/topics?course=python').set('Authorization', auth)).status).toBe(200);
  });

  it('refuses an account that already has access', async () => {
    const { auth } = await newUser({ subscriptionStatus: 'active' });
    expect((await request(app).post('/api/billing/bypass-trial').set('Authorization', auth)).status).toBe(409);
  });

  it('needs a signed-in account', async () => {
    expect((await request(app).post('/api/billing/bypass-trial')).status).toBe(401);
  });
});
