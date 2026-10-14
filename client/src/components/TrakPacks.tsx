import { useState } from 'react';
import { billingApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import type { TrakPack, UsageSummary } from '../api/types';

// Billing page card: buy extra Trak questions (server: POST /billing/trak-pack,
// credited by the Stripe webhook). Members only; the server enforces it too.

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function TrakPacks({
  packs,
  usage,
  isMember,
  justBought,
}: {
  packs: TrakPack[];
  usage: UsageSummary | null;
  isMember: boolean;
  justBought: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function buy(pack: TrakPack) {
    setBusy(pack.id);
    setError(null);
    try {
      const { url } = await billingApi.buyTrakPack(pack.id);
      window.location.href = url;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setBusy(null);
    }
  }

  return (
    <div className="card" id="trak-packs" style={{ marginTop: 16 }}>
      <h3 style={{ marginTop: 0 }}>Extra Trak questions</h3>
      <p className="text-dim" style={{ marginTop: 0 }}>
        Used only after your {usage?.trak?.limit ?? 100} weekly questions run out, and they never expire.
        {usage && usage.bonusTrak > 0 && (
          <>
            {' '}
            You have <strong>{usage.bonusTrak}</strong> left.
          </>
        )}
      </p>
      {justBought && (
        <div className="card billing-success">
          Thanks! Your questions will show up here in a moment. They're added as soon as Stripe confirms the payment.
        </div>
      )}
      {error && <div className="error-banner">{error}</div>}
      {isMember ? (
        <>
          <div className="trak-pack-list">
            {packs.map((p) => (
              <div key={p.id} className="trak-pack">
                <div>
                  <strong>{p.questions} questions</strong>
                  <div className="text-faint" style={{ fontSize: 12 }}>
                    {money(p.priceCents)} · {(p.priceCents / p.questions).toFixed(1)}¢ each
                  </div>
                </div>
                <button className="btn btn-sm btn-primary" disabled={busy !== null} onClick={() => buy(p)}>
                  {busy === p.id ? <span className="spinner" /> : `Buy for ${money(p.priceCents)}`}
                </button>
              </div>
            ))}
          </div>
          <p className="text-faint" style={{ fontSize: 12, marginBottom: 0 }}>
            Charged right away as a one-time payment, separate from your membership, plus applicable tax. The
            founding-member discount doesn't apply to tutoring packs.
          </p>
        </>
      ) : (
        <p className="text-faint" style={{ fontSize: 13, marginBottom: 0 }}>
          Available once your membership starts.
        </p>
      )}
    </div>
  );
}
