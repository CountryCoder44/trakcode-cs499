import { useEffect, useState } from 'react';
import { authApi } from '../api/endpoints';
import type { AuthProviderInfo, OAuthProvider } from '../api/types';

// Inline brand marks, so there's no extra request or icon library.
export function ProviderIcon({ provider, size = 18 }: { provider: OAuthProvider; size?: number }) {
  if (provider === 'google') {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      </svg>
    );
  }
  if (provider === 'github') {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#0A66C2" d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

// Which providers the server has keys for. Shared by the sign-in buttons and
// the Settings "Connected accounts" card.
export function useAuthProviders(): AuthProviderInfo[] | null {
  const [providers, setProviders] = useState<AuthProviderInfo[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    authApi
      .providers()
      .then((res) => !cancelled && setProviders(res.providers))
      .catch(() => !cancelled && setProviders([]));
    return () => {
      cancelled = true;
    };
  }, []);
  return providers;
}

/**
 * "Continue with Google / GitHub / LinkedIn". Each button is a full-page
 * navigation to the server's /auth/oauth/:provider/start, which redirects on to
 * the provider and eventually back to /auth/callback. The same buttons serve
 * sign-up and log-in, since the server finds, links, or creates the account.
 * Renders nothing (not even the "or" divider) when no provider is configured.
 */
export default function SocialAuthButtons({ dividerLabel = 'or use email' }: { dividerLabel?: string }) {
  const providers = useAuthProviders();
  const [pending, setPending] = useState<OAuthProvider | null>(null);

  if (!providers || providers.length === 0) return null;

  return (
    <>
      <div className="social-auth">
        {providers.map((p) => (
          <button
            key={p.id}
            type="button"
            className="btn btn-block btn-social"
            disabled={pending !== null}
            onClick={() => {
              setPending(p.id);
              window.location.href = authApi.oauthStartUrl(p.id);
            }}
          >
            {pending === p.id ? <span className="spinner" /> : <ProviderIcon provider={p.id} />}
            <span>Continue with {p.label}</span>
          </button>
        ))}
      </div>
      <div className="auth-divider">
        <span>{dividerLabel}</span>
      </div>
    </>
  );
}
