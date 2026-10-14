import crypto from 'crypto';
import { env } from '../../config/env';
import { OAuthProvider } from '../../models/User';
import { OAuthNotConfiguredError } from '../../errors/AppError';

// Social sign-in provider registry. Each entry is plain OAuth 2.0
// authorization-code config plus a `fetchProfile` that normalizes the provider's
// user info into one shape. Adding a provider (Microsoft, Discord, …) means one
// entry here, its env vars in config/env.ts, and its name in OAUTH_PROVIDERS
// (models/User.ts).
//
// Hand-rolled rather than using a library like `arctic`: that one is ESM-only
// and this server is CommonJS compiled through ts-jest, and the whole flow is a
// URL builder plus one form POST.

export interface OAuthProfile {
  provider: OAuthProvider;
  providerUserId: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
}

interface ProviderConfig {
  label: string;
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string[];
  // LinkedIn doesn't support PKCE for server-side web apps; it still gets `state`.
  pkce: boolean;
  extraAuthorizeParams?: Record<string, string>;
  clientId: () => string | undefined;
  clientSecret: () => string | undefined;
  fetchProfile: (accessToken: string) => Promise<OAuthProfile>;
}

async function getJson<T>(url: string, accessToken: string, label: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json', 'User-Agent': 'TrakCode' },
  });
  if (!res.ok) {
    throw new Error(`${label} profile request ${url} returned ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

// OIDC userinfo shape shared by Google and LinkedIn.
interface OidcUserInfo {
  sub: string;
  email?: string;
  email_verified?: boolean | string;
  name?: string;
}

function fromOidc(provider: OAuthProvider, info: OidcUserInfo): OAuthProfile {
  return {
    provider,
    providerUserId: info.sub,
    email: info.email ?? null,
    // Some providers send "true" as a string.
    emailVerified: info.email_verified === true || info.email_verified === 'true',
    name: info.name ?? null,
  };
}

interface GithubUser {
  id: number;
  login: string;
  name: string | null;
}
interface GithubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

export const PROVIDERS: Record<OAuthProvider, ProviderConfig> = {
  google: {
    label: 'Google',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['openid', 'email', 'profile'],
    pkce: true,
    extraAuthorizeParams: { prompt: 'select_account' },
    clientId: () => env.GOOGLE_CLIENT_ID,
    clientSecret: () => env.GOOGLE_CLIENT_SECRET,
    fetchProfile: async (token) =>
      fromOidc('google', await getJson<OidcUserInfo>('https://openidconnect.googleapis.com/v1/userinfo', token, 'Google')),
  },
  github: {
    label: 'GitHub',
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    // public_repo is requested up front (product decision) so a learner who signs
    // in or connects with GitHub can push solutions to their portfolio repo
    // right away, with no second consent screen. The token is stored encrypted.
    scopes: ['read:user', 'user:email', 'public_repo'],
    pkce: true,
    clientId: () => env.GITHUB_CLIENT_ID,
    clientSecret: () => env.GITHUB_CLIENT_SECRET,
    fetchProfile: async (token) => {
      const user = await getJson<GithubUser>('https://api.github.com/user', token, 'GitHub');
      const emails = await getJson<GithubEmail[]>('https://api.github.com/user/emails', token, 'GitHub');
      const chosen = emails.find((e) => e.primary && e.verified) ?? emails.find((e) => e.verified) ?? null;
      return {
        provider: 'github',
        providerUserId: String(user.id),
        email: chosen?.email ?? null,
        emailVerified: chosen !== null,
        name: user.name || user.login,
      };
    },
  },
  linkedin: {
    label: 'LinkedIn',
    authorizeUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    // Requires BOTH products on the LinkedIn app: "Sign In with LinkedIn using
    // OpenID Connect" (openid/profile/email) and "Share on LinkedIn"
    // (w_member_social, used to post milestones to the member's feed). Requesting
    // a scope whose product isn't added makes LinkedIn reject the whole sign-in.
    scopes: ['openid', 'profile', 'email', 'w_member_social'],
    pkce: false,
    clientId: () => env.LINKEDIN_CLIENT_ID,
    clientSecret: () => env.LINKEDIN_CLIENT_SECRET,
    fetchProfile: async (token) =>
      fromOidc('linkedin', await getJson<OidcUserInfo>('https://api.linkedin.com/v2/userinfo', token, 'LinkedIn')),
  },
};

export function isProvider(value: string): value is OAuthProvider {
  return Object.prototype.hasOwnProperty.call(PROVIDERS, value);
}

export function isConfigured(provider: OAuthProvider): boolean {
  const p = PROVIDERS[provider];
  return Boolean(p.clientId() && p.clientSecret());
}

export function configuredProviders(): OAuthProvider[] {
  return (Object.keys(PROVIDERS) as OAuthProvider[]).filter(isConfigured);
}

export function callbackUrl(provider: OAuthProvider): string {
  return `${env.OAUTH_CALLBACK_BASE_URL.replace(/\/$/, '')}/${provider}/callback`;
}

function requireCredentials(provider: OAuthProvider): { clientId: string; clientSecret: string } {
  const p = PROVIDERS[provider];
  const clientId = p.clientId();
  const clientSecret = p.clientSecret();
  if (!clientId || !clientSecret) throw new OAuthNotConfiguredError(p.label);
  return { clientId, clientSecret };
}

// ---- PKCE / state ----

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function randomToken(bytes = 32): string {
  return base64url(crypto.randomBytes(bytes));
}

export function pkceChallenge(verifier: string): string {
  return base64url(crypto.createHash('sha256').update(verifier).digest());
}

// ---- The two calls every provider makes ----

export function buildAuthorizeUrl(provider: OAuthProvider, state: string, codeVerifier: string): string {
  const p = PROVIDERS[provider];
  const { clientId } = requireCredentials(provider);

  const url = new URL(p.authorizeUrl);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', callbackUrl(provider));
  url.searchParams.set('scope', p.scopes.join(' '));
  url.searchParams.set('state', state);
  if (p.pkce) {
    url.searchParams.set('code_challenge', pkceChallenge(codeVerifier));
    url.searchParams.set('code_challenge_method', 'S256');
  }
  for (const [k, v] of Object.entries(p.extraAuthorizeParams ?? {})) url.searchParams.set(k, v);
  return url.toString();
}

interface TokenResponse {
  access_token?: string;
  expires_in?: number; // seconds; LinkedIn sends it (tokens last ~60 days), GitHub doesn't
  error?: string;
  error_description?: string;
}

export interface ExchangedToken {
  accessToken: string;
  expiresIn?: number; // seconds
}

export async function exchangeCode(
  provider: OAuthProvider,
  code: string,
  codeVerifier: string
): Promise<ExchangedToken> {
  const p = PROVIDERS[provider];
  const { clientId, clientSecret } = requireCredentials(provider);

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: callbackUrl(provider),
    client_id: clientId,
    client_secret: clientSecret,
  });
  if (p.pkce) body.set('code_verifier', codeVerifier);

  const res = await fetch(p.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
  });
  // GitHub reports failures as a 200 with an `error` field, so check both.
  const json = (await res.json().catch(() => ({}))) as TokenResponse;
  if (!res.ok || !json.access_token) {
    throw new Error(
      `${p.label} token exchange failed (${res.status}): ${json.error ?? 'unknown'} ${json.error_description ?? ''}`.trim()
    );
  }
  return { accessToken: json.access_token, expiresIn: json.expires_in };
}
