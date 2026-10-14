import { useEffect, useState } from 'react';
import { billingApi } from '../api/endpoints';
import type { BillingStatus } from '../api/types';
import { ApiError } from '../api/client';

const STATUS_LABEL: Record<BillingStatus['subscriptionStatus'], string> = {
  trial: 'Free trial',
  active: 'Active',
  past_due: 'Past due',
  canceled: 'Canceled',
  demo: 'Demo account',
};

export default function BillingPage() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    billingApi
      .status()
      .then(setStatus)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load billing status'));
  }

  useEffect(load, []);

  async function handleCheckout(plan: 'monthly' | 'annual') {
    setBusy(true);
    setError(null);
    try {
      const { url } = await billingApi.checkout(plan);
      window.location.href = url;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start checkout');
      setBusy(false);
    }
  }

  async function handleCancel() {
    setBusy(true);
    setError(null);
    try {
      const res = await billingApi.cancel();
      setError(null);
      alert(`Your plan will cancel at the end of the current period (${new Date(res.currentPeriodEnd).toLocaleDateString()}).`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not cancel subscription');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-narrow">
      <h1>Billing</h1>
      {error && <div className="error-banner">{error}</div>}

      {!status ? (
        <div className="empty-state">
          <span className="spinner" />
        </div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="flex justify-between items-center">
              <div>
                <div className="text-dim" style={{ fontSize: 13 }}>
                  Current plan
                </div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{STATUS_LABEL[status.subscriptionStatus]}</div>
              </div>
              {status.subscriptionStatus === 'trial' && status.trialEndsAt && (
                <span className="badge badge-warning">Trial ends {new Date(status.trialEndsAt).toLocaleDateString()}</span>
              )}
            </div>
          </div>

          {status.hasActiveSubscription ? (
            <div className="card">
              <p>Manage your subscription below.</p>
              <button className="btn btn-danger" onClick={handleCancel} disabled={busy}>
                {busy ? <span className="spinner" /> : 'Cancel at period end'}
              </button>
            </div>
          ) : (
            <div className="grid grid-2">
              <div className="card">
                <h3>Monthly</h3>
                <p>Full access, billed monthly.</p>
                <button className="btn btn-primary btn-block" onClick={() => handleCheckout('monthly')} disabled={busy}>
                  {busy ? <span className="spinner" /> : 'Subscribe monthly'}
                </button>
              </div>
              <div className="card">
                <h3>Annual</h3>
                <p>Full access, billed yearly — best value.</p>
                <button className="btn btn-primary btn-block" onClick={() => handleCheckout('annual')} disabled={busy}>
                  {busy ? <span className="spinner" /> : 'Subscribe annually'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
