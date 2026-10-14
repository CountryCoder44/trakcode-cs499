import { useEffect, useState } from 'react';
import { adminApi } from '../../api/endpoints';
import { ApiError } from '../../api/client';
import type { AdminUserPack } from '../../api/types';

// Admin, Users: one learner's tutoring packs. Bought questions come out of the
// oldest pack first, so each pack shows how many of its own questions were
// used. A pack qualifies for the 7-day refund only while it's completely unused.

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function day(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function refundStatus(p: AdminUserPack): { label: string; badge: string } {
  if (p.forfeited) return { label: 'Ended with account', badge: 'badge-neutral' };
  if (p.refundEligible) return { label: `Refundable until ${day(p.refundWindowEndsAt)}`, badge: 'badge-success' };
  if (!p.unused) return { label: 'Used, not refundable', badge: 'badge-neutral' };
  return { label: 'Unused, past 7 days', badge: 'badge-warning' };
}

export default function UserPacks({
  userId,
  email,
  onClose,
  onError,
}: {
  userId: string;
  email: string;
  onClose: () => void;
  onError: (msg: string | null) => void;
}) {
  const [data, setData] = useState<{ balance: number; packs: AdminUserPack[] } | null>(null);

  useEffect(() => {
    setData(null);
    adminApi
      .userPacks(userId)
      .then(setData)
      .catch((err) => onError(err instanceof ApiError ? err.message : 'Failed to load packs'));
  }, [userId, onError]);

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="flex items-center" style={{ justifyContent: 'space-between', gap: 12 }}>
        <h3 style={{ margin: 0 }}>Tutoring packs: {email}</h3>
        <button className="btn btn-sm" onClick={onClose}>
          Close
        </button>
      </div>
      {!data ? (
        <span className="spinner" />
      ) : data.packs.length === 0 ? (
        <p className="text-dim">No tutoring packs bought.</p>
      ) : (
        <>
          <p className="text-faint" style={{ fontSize: 13 }}>
            {data.balance} bought question{data.balance === 1 ? '' : 's'} left in total. Questions come out of the oldest
            pack first.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Bought</th>
                  <th>Pack</th>
                  <th>Paid</th>
                  <th>Used</th>
                  <th>Left</th>
                  <th>Refund</th>
                  <th>Stripe session</th>
                </tr>
              </thead>
              <tbody>
                {data.packs.map((p) => {
                  const status = refundStatus(p);
                  return (
                    <tr key={p.id}>
                      <td>{day(p.boughtAt)}</td>
                      <td>{p.questions} questions</td>
                      <td>{money(p.amountCents)}</td>
                      <td>{p.used}</td>
                      <td>{p.remaining}</td>
                      <td>
                        <span className={`badge ${status.badge}`}>{status.label}</span>
                      </td>
                      <td className="text-faint" style={{ fontSize: 12 }}>
                        {p.stripeSessionId}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
