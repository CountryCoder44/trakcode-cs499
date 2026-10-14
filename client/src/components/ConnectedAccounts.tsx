import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import type { OAuthProvider } from '../api/types';
import { ProviderIcon, useAuthProviders } from './SocialAuthButtons';

const LABELS: Record<OAuthProvider, string> = { google: 'Google', github: 'GitHub', linkedin: 'LinkedIn' };

// Settings → "Connected accounts". Connect is a redirect round trip through the
// provider that comes back to this page; disconnect is a plain API call. The
// server refuses to remove the last way to sign in, and the button mirrors that.
export default function ConnectedAccounts() {
  const { user, refreshUser } = useAuth();
  const configured = useAuthProviders();
  const [busy, setBusy] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!user || configured === null) return null;

  const linked = new Map(user.identities.map((i) => [i.provider, i]));
  // Configured providers, plus any linked one whose keys were later removed (so it can still be disconnected).
  const rows = Array.from(new Set<OAuthProvider>([...configured.map((p) => p.id), ...linked.keys()]));
  if (rows.length === 0) return null;

  const signInMethods = user.identities.length + (user.hasPassword ? 1 : 0);

  async function connect(provider: OAuthProvider) {
    setBusy(provider);
    setError(null);
    try {
      const { url } = await authApi.linkProvider(provider, { returnTo: '/settings/profile' });
      window.location.href = url;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start connecting');
      setBusy(null);
    }
  }

  async function disconnect(provider: OAuthProvider) {
    if (!window.confirm(`Disconnect ${LABELS[provider]}? You won't be able to sign in with it anymore.`)) return;
    setBusy(provider);
    setError(null);
    try {
      await authApi.unlinkProvider(provider);
      await refreshUser();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not disconnect');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h3>Connected accounts</h3>
      <p className="text-faint" style={{ fontSize: 13 }}>
        Any connected account signs you in to this same TrakCode account.
      </p>
      {error && <div className="error-banner">{error}</div>}
      {rows.map((provider) => {
        const identity = linked.get(provider);
        const isLast = Boolean(identity) && signInMethods <= 1;
        // Connected, but without a working token for what we use it for: GitHub
        // linked before push access was part of sign-in, or LinkedIn's ~60-day
        // posting token has lapsed. Either way, reconnecting fixes it.
        const needsReconnect =
          Boolean(identity) &&
          ((provider === 'github' && !user.githubPortfolioConnected) ||
            (provider === 'linkedin' && !user.linkedinSharingConnected));
        return (
          <div key={provider} className="connected-account">
            <ProviderIcon provider={provider} size={22} />
            <div className="connected-account-info">
              <div style={{ fontWeight: 600 }}>{LABELS[provider]}</div>
              <div className="text-faint" style={{ fontSize: 13 }}>
                {identity ? identity.email ?? 'Connected' : 'Not connected'}
                {provider === 'github' &&
                  (identity && !needsReconnect
                    ? ' · can push solutions to your GitHub'
                    : ' · connect to push solutions to your GitHub')}
                {provider === 'linkedin' &&
                  (identity && !needsReconnect
                    ? ' · can share your milestones on LinkedIn'
                    : identity
                      ? ' · sharing paused, reconnect to share milestones'
                      : ' · connect to share your milestones on LinkedIn')}
              </div>
            </div>
            {needsReconnect && (
              <button className="btn btn-sm btn-primary" onClick={() => connect(provider)} disabled={busy !== null}>
                Reconnect
              </button>
            )}
            {identity ? (
              <button
                className="btn btn-sm"
                onClick={() => disconnect(provider)}
                disabled={busy !== null || isLast}
                title={isLast ? 'This is your only way to sign in. Connect another account first.' : undefined}
              >
                {busy === provider ? <span className="spinner" /> : 'Disconnect'}
              </button>
            ) : (
              <button className="btn btn-sm btn-primary" onClick={() => connect(provider)} disabled={busy !== null}>
                {busy === provider ? <span className="spinner" /> : 'Connect'}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
