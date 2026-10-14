import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { billingApi } from '../api/endpoints';
import type { BillingStatus } from '../api/types';
import { ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import TrakPacks from '../components/TrakPacks';
import { FairUseMeter, useUsage } from '../components/TrakAllowance';

function money(cents: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);
}

function longDate(iso: string | null | Date): string {
  return iso ? new Date(iso).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : '';
}

const INCLUDED = [
  'Every Learn course, start to finish',
  'Practice Mode problems matched to what you have learned',
  'Trak, your AI tutor, in every lesson and problem',
  'Push your solutions to your GitHub portfolio',
];

export default function BillingPage() {
  const { user, refreshUser } = useAuth();
  const [searchParams] = useSearchParams();
  const justCheckedOut = searchParams.get('checkout') === 'success';
  const justBoughtPack = searchParams.get('pack') === 'success';
  const { usage, refresh: refreshUsage } = useUsage();
  // Back from buying a tutoring pack: Stripe's webhook credits the questions a
  // moment later, so check a few times.
  useEffect(() => {
    if (!justBoughtPack) return;
    const timers = [1500, 4000, 8000, 15000].map((ms) => window.setTimeout(refreshUsage, ms));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [justBoughtPack, refreshUsage]);
  const navigate = useNavigate();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = await billingApi.status();
      setStatus(s);
      return s;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load billing status');
      return null;
    }
  }, []);

  // Back from Stripe Checkout: Stripe's confirmation (webhook) can land a few
  // seconds after the redirect, so wait for it, then go on to the dashboard.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let s = await load();
      for (let i = 0; justCheckedOut && !cancelled && s && !s.hasSubscription && i < 10; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        s = await load();
      }
      if (!justCheckedOut || cancelled) return;
      await refreshUser();
      if (s?.hasSubscription) navigate(`/dashboard?welcome=${s.subscriptionStatus === 'trial' ? 'trial' : 'member'}`, { replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [load, justCheckedOut, refreshUser, navigate]);

  async function startCheckout() {
    setBusy(true);
    setError(null);
    try {
      const { url } = await billingApi.checkout(acceptedTerms);
      window.location.href = url;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setBusy(false);
    }
  }

  // Capstone build: Stripe is switched off, so this button gives the account a
  // free trial directly, then continues to the dashboard like a real checkout.
  async function startBypassTrial() {
    setBusy(true);
    setError(null);
    try {
      await billingApi.bypassTrial();
      await refreshUser();
      navigate('/dashboard?welcome=trial', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setBusy(false);
    }
  }

  // Skip the rest of the free trial: Stripe bills the first month now.
  const [startedNote, setStartedNote] = useState<string | null>(null);
  async function startMembershipNow(priceLabel: string | null) {
    const charge = priceLabel ? `You'll be charged ${priceLabel} today` : "You'll be charged today";
    if (!window.confirm(`Start your membership now? ${charge}, and your free trial ends.`)) return;
    setBusy(true);
    setError(null);
    try {
      await billingApi.startMembership();
      await Promise.all([load(), refreshUser()]);
      setStartedNote('Your membership has started. Full access is on: 100 Trak questions a week and 20 new practice questions a month.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  // Stripe's portal opens in a new tab. The tab is opened right away, inside the
  // click, so pop-up blockers allow it, then pointed at Stripe once we have the link.
  async function openPortal() {
    const tab = window.open('', '_blank');
    // Cut the new tab's link back to this page (window.opener), as rel="noopener" would.
    if (tab) tab.opener = null;
    setError(null);
    try {
      const { url } = await billingApi.portal();
      if (tab) tab.location.href = url;
      else window.location.href = url; // pop-ups fully blocked: use this tab instead
    } catch (err) {
      tab?.close();
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    }
  }

  // Changes made in the Stripe tab (cancel, new card) show up here as soon as the
  // learner switches back to this tab.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        load();
        refreshUser();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load, refreshUser]);

  if (!status) {
    return (
      <div className="container-narrow">
        <h1>Billing</h1>
        {error ? <div className="error-banner">{error}</div> : <div className="empty-state"><span className="spinner" /></div>}
      </div>
    );
  }

  const fullCents = status.price?.amountCents ?? null;
  const pct = status.foundingMember ? status.price?.founderPercentOff ?? null : null;
  const yourCents = fullCents !== null && pct ? Math.round(fullCents * (1 - pct / 100)) : fullCents;
  const currency = status.price?.currency ?? 'usd';
  const trialEnd = new Date(Date.now() + status.trialDays * 86400000);
  const renewPrice = yourCents !== null ? money(yourCents, currency) : 'the monthly price';
  const planName = status.price?.productName ?? 'TrakCode';

  return (
    <div className="container-narrow">
      <h1>Billing</h1>
      {error && <div className="error-banner">{error}</div>}

      {justCheckedOut && !status.hasSubscription && !status.trialDeniedReason && (
        <div className="card billing-success">
          <strong>Payment received, finishing setup…</strong>
          <div className="text-dim">
            This usually takes a few seconds. If it doesn't update, refresh the page.
          </div>
        </div>
      )}

      {status.hasSubscription ? (
        <div className="card">
          <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div className="text-dim" style={{ fontSize: 13 }}>
                Your plan
              </div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{planName} membership</div>
            </div>
            {status.foundingMember && <span className="badge badge-accent">Founding member</span>}
          </div>

          {yourCents !== null && (
            <p style={{ marginBottom: 4 }}>
              <strong>{money(yourCents, currency)}</strong> / month
              <span className="text-faint"> plus applicable tax</span>
              {pct ? <span className="text-dim"> · {pct}% founding-member discount, for life</span> : null}
            </p>
          )}

          <p className="text-dim" style={{ marginTop: 0 }}>
            {status.subscriptionStatus === 'trial' &&
              `Free trial until ${longDate(status.trialEndsAt)}. Your first charge is on that day.`}
            {status.subscriptionStatus === 'active' &&
              (status.cancelAtPeriodEnd
                ? `Cancelled. You keep access until ${longDate(status.currentPeriodEnd)}.`
                : `Renews on ${longDate(status.currentPeriodEnd)}.`)}
          </p>

          {startedNote && <div className="card billing-success">{startedNote}</div>}

          <FairUseMeter usage={usage} />

          {status.subscriptionStatus === 'trial' && (
            <div className="trial-limits">
              <p style={{ margin: '0 0 8px' }}>
                The free trial includes <strong>20 Trak questions a day</strong> and <strong>5 new practice questions</strong>.
                Members get 100 Trak questions a week and 20 new practice questions a month.
              </p>
              <button
                className="btn"
                disabled={busy}
                onClick={() => startMembershipNow(yourCents !== null ? money(yourCents, currency) : null)}
              >
                {busy ? <span className="spinner" /> : 'Skip the trial: start my membership now'}
              </button>
            </div>
          )}

          {status.subscriptionStatus === 'past_due' && (
            <div className="error-banner">
              We couldn't charge your card. Update your payment method to keep your access.
            </div>
          )}

          <button className="btn btn-primary" onClick={openPortal}>
            Manage subscription ↗
          </button>
          <div className="text-faint" style={{ fontSize: 13, marginTop: 8 }}>
            {status.subscriptionStatus === 'trial'
              ? "Cancelling during your free trial ends your access right away. You won't be charged, and you won't be offered another free trial."
              : 'Change your card, cancel, or download invoices. Opens Stripe in a new tab.'}
          </div>
        </div>
      ) : user?.role === 'admin' || status.subscriptionStatus === 'demo' ? (
        <div className="card">
          <strong>{user?.role === 'admin' ? 'Admin account' : 'Free access'}</strong>
          <p className="text-dim" style={{ marginBottom: 0 }}>
            This account has full access without a subscription.
          </p>
        </div>
      ) : status.subscriptionStatus === 'trial' ? (
        <div className="card">
          <strong>Free trial</strong>
          <p className="text-dim">
            Your free trial runs until {longDate(status.trialEndsAt)}. No payment details are needed in this version.
          </p>
          <FairUseMeter usage={usage} />
        </div>
      ) : (
        <div className="card billing-offer">
          {status.trialDeniedReason === 'card-reused' && (
            <div className="error-banner">
              The card you used has already been used for a free trial, so your trial was cancelled and you weren't charged.
              You can still subscribe below; you'll be charged today.
            </div>
          )}
          <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 8 }}>
            <h2 style={{ margin: 0 }}>{status.subscriptionStatus === 'canceled' ? 'Welcome back' : `${planName} membership`}</h2>
            {status.foundingMember && <span className="badge badge-accent">Founding member</span>}
          </div>

          {yourCents !== null && fullCents !== null && (
            <div className="billing-price">
              {pct ? <span className="billing-price-was">{money(fullCents, currency)}</span> : null}
              <span className="billing-price-now">{money(yourCents, currency)}</span>
              <span className="text-dim"> / month</span>
              <span className="text-faint" style={{ fontSize: 13 }}> plus applicable tax</span>
            </div>
          )}
          {pct ? (
            <p className="billing-founder-note">
              You joined early, so you get {pct}% off <strong>for life</strong> as a founding member. Thank you for
              believing in TrakCode while it's growing.
            </p>
          ) : null}

          <ul className="billing-included">
            {INCLUDED.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>

          <label className="billing-terms">
            <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} />
            <span>
              I'm at least 18 years old and I agree to the{' '}
              <a href="/terms" target="_blank" rel="noopener noreferrer">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" target="_blank" rel="noopener noreferrer">
                Privacy Policy
              </a>
              .
            </span>
          </label>
          {status.billingConfigured && (
            <>
              <button className="btn btn-primary btn-block" onClick={startCheckout} disabled={busy || !acceptedTerms}>
                {busy ? (
                  <span className="spinner" />
                ) : status.trialAvailable ? (
                  `Start my ${status.trialDays}-day free trial`
                ) : (
                  'Subscribe'
                )}
              </button>
              <div className="text-faint" style={{ fontSize: 13, marginTop: 8, textAlign: 'center' }}>
                {status.trialAvailable
                  ? `Card required. You won't be charged until ${longDate(trialEnd)}. Then ${renewPrice} a month, plus applicable tax, renewing every month until you cancel. Cancel anytime in Billing → Manage subscription. One free trial per person: if you cancel during the trial, your access ends right away and you won't be offered another free trial.`
                  : `Charged today: ${renewPrice}, plus applicable tax, renewing every month until you cancel. Cancel anytime in Billing → Manage subscription.`}
              </div>
            </>
          )}
          <div className="billing-bypass">
            <button
              className={`btn btn-block${status.billingConfigured ? '' : ' btn-primary'}`}
              onClick={startBypassTrial}
              disabled={busy || !acceptedTerms}
            >
              {busy ? <span className="spinner" /> : `Skip payment: start a ${status.trialDays}-day free trial`}
            </button>
            <div className="text-faint" style={{ fontSize: 13, marginTop: 8, textAlign: 'center' }}>
              Payments are switched off in this capstone version. This gives your account the same free trial a paid
              checkout would, with no card needed.
            </div>
          </div>
        </div>
      )}
      {status.trakPacks && status.trakPacks.length > 0 && (user?.role !== 'admin') && (
        <TrakPacks
          packs={status.trakPacks}
          usage={usage}
          isMember={['active', 'past_due', 'demo'].includes(status.subscriptionStatus)}
          justBought={justBoughtPack}
        />
      )}
    </div>
  );
}
