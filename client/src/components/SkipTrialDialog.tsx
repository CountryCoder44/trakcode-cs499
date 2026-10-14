import { useEffect, useState } from 'react';
import { billingApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import type { BillingStatus } from '../api/types';
import { useAuth } from '../context/AuthContext';

// "Skip the trial" pop-up, opened from Trak's allowance line and its limit
// notice during the free trial. Kept as an overlay on purpose: sending trial
// learners to Billing puts this next to the Manage subscription (cancel)
// button. Starting the membership bills the first month immediately
// (POST /billing/start-membership).

function money(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);
}

export default function SkipTrialDialog({ onClose, onStarted }: { onClose: () => void; onStarted?: () => void }) {
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    billingApi
      .status()
      .then(setStatus)
      .catch(() => {
        /* the price line just stays hidden */
      });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const price = status?.price;
  const pct = status?.foundingMember ? (price?.founderPercentOff ?? null) : null;
  const cents = price ? (pct ? Math.round(price.amountCents * (1 - pct / 100)) : price.amountCents) : null;

  async function startNow() {
    setBusy(true);
    setError(null);
    try {
      await billingApi.startMembership();
      await refreshUser();
      setDone(true);
      onStarted?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="console-popup-backdrop" onClick={busy ? undefined : onClose}>
      <div className="console-popup skip-trial" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="skip-trial-title">
        <div className="console-popup-header">
          <strong id="skip-trial-title">{done ? "You're a member!" : 'Skip the free trial?'}</strong>
          <button className="btn btn-sm" onClick={onClose} disabled={busy}>
            Close
          </button>
        </div>
        <div className="skip-trial-body">
          {done ? (
            <>
              <p style={{ marginTop: 0 }}>
                Your membership has started. You now have 100 Trak questions a week and 20 new practice questions a month.
              </p>
              <button className="btn btn-primary" onClick={onClose}>
                Back to learning
              </button>
            </>
          ) : (
            <>
              {error && <div className="error-banner">{error}</div>}
              <p style={{ marginTop: 0 }}>
                Your free trial includes <strong>20 Trak questions a day</strong> and <strong>5 new practice questions</strong>.
                Members get <strong>100 Trak questions a week</strong> and <strong>20 new practice questions a month</strong>, and
                can add extra Trak questions anytime.
              </p>
              <p>
                Starting now ends your trial and charges your first month today
                {cents !== null && price ? (
                  <>
                    : <strong>{money(cents, price.currency)}</strong> a month
                    {pct ? ` (your ${pct}% founding-member price)` : ''}, plus applicable tax
                  </>
                ) : null}
                .
              </p>
              <p className="text-faint" style={{ fontSize: 13 }}>
                <a href="/terms#allowances" target="_blank" rel="noreferrer">
                  How membership, the trial and allowances work
                </a>{' '}
                (Terms of Service, section 3)
              </p>
              <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={startNow} disabled={busy}>
                  {busy ? <span className="spinner" /> : 'Start my membership now'}
                </button>
                <button className="btn" onClick={onClose} disabled={busy}>
                  Not now
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
