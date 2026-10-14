import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { profileApi } from '../api/endpoints';
import type { AccountDeletionState } from '../api/types';
import { ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';

function longDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : '';
}

// "Delete my account" in Profile → Account. A membership that's still set to
// renew is cancelled as part of it: a trial ends now and the account goes now;
// paid time runs out first, then the account is deleted. A cancelled membership
// with paid time left schedules it for the end of that time; otherwise it
// happens right away.
export default function DeleteAccount() {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<AccountDeletionState | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    profileApi
      .accountDeletion()
      .then((r) => setState(r.state))
      .catch(() => setState(null));
  }, []);
  useEffect(load, [load]);

  // Cancelling in the Stripe tab shows up here when the learner comes back.
  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

  if (!state || state.kind === 'admin') return null;

  async function confirmDelete() {
    setBusy(true);
    setError(null);
    try {
      const r = await profileApi.deleteAccount(typed.trim());
      if ('deleted' in r) {
        logout();
        navigate('/', { replace: true });
        return;
      }
      setConfirming(false);
      setTyped('');
      load();
      await refreshUser();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function keep() {
    setBusy(true);
    try {
      await profileApi.keepAccount();
      load();
      await refreshUser();
    } finally {
      setBusy(false);
    }
  }

  const deletesLater = state.kind === 'at-period-end' || (state.kind === 'renewing' && !state.trial && Boolean(state.renewsOn));

  return (
    <div className="delete-account">
      <h4 style={{ margin: '0 0 6px' }}>Delete my account</h4>

      {state.kind === 'scheduled' ? (
        <>
          <p className="text-dim" style={{ marginTop: 0 }}>
            Your account will be deleted on <strong>{longDate(state.deleteOn)}</strong>, when your final billing period ends. You
            can keep using TrakCode until then.
          </p>
          <button className="btn" onClick={keep} disabled={busy}>
            Keep my account
          </button>
        </>
      ) : (
        <>
          <p className="text-dim" style={{ marginTop: 0 }}>
            {state.kind === 'renewing' && state.trial ? (
              <>
                Deleting your account also ends your free trial right away. You won't be charged. Your account, progress,
                code and conversations with Trak are then deleted. It can't be undone.
              </>
            ) : state.kind === 'renewing' ? (
              <>
                Deleting your account also cancels your membership, so you won't be charged again. You can keep using
                TrakCode until your paid time ends{state.renewsOn ? <> on <strong>{longDate(state.renewsOn)}</strong></> : null},
                and the account is deleted then. Want to keep the membership? See <Link to="/billing">Billing</Link>.
              </>
            ) : state.kind === 'at-period-end' ? (
              <>
                Your membership is cancelled. If you delete your account, it stays open until your final billing period ends on{' '}
                <strong>{longDate(state.deleteOn)}</strong> and is deleted then.
              </>
            ) : (
              <>This permanently deletes your account, your progress, your code and your conversations with Trak. It can't be undone.</>
            )}
          </p>

          {!confirming ? (
            <button className="btn btn-danger" onClick={() => setConfirming(true)}>
              Delete my account
            </button>
          ) : (
            <div className="delete-account-confirm">
              {error && <div className="error-banner">{error}</div>}
              <label htmlFor="confirm-delete" style={{ fontSize: 14 }}>
                Type <strong>{user?.email}</strong> to confirm
              </label>
              <input
                id="confirm-delete"
                className="input"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                autoFocus
              />
              <div className="flex gap-2" style={{ marginTop: 10 }}>
                <button
                  className="btn btn-danger"
                  onClick={confirmDelete}
                  disabled={busy || typed.trim().toLowerCase() !== (user?.email ?? '').toLowerCase()}
                >
                  {busy ? (
                    <span className="spinner" />
                  ) : deletesLater ? (
                    'Cancel membership and delete at end of billing period'
                  ) : (
                    'Delete my account now'
                  )}
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    setConfirming(false);
                    setTyped('');
                    setError(null);
                  }}
                  disabled={busy}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
