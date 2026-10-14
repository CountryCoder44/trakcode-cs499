const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');
const TOKEN_KEY = 'trakcode_token';
// Fired when the API says the paid parts of the app need a subscription (402);
// Layout sends the learner to Billing.
export const SUBSCRIPTION_REQUIRED_EVENT = 'trakcode:subscription-required';
// Fired when the API says this account is banned (403).
export const ACCOUNT_STANDING_EVENT = 'trakcode:account-standing';

// Absolute URL for an API path, for browser navigations (social sign-in starts
// with a full-page redirect, not a fetch).
export function apiUrl(path: string): string {
  return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  // Field errors (validation) or, for limits, `{ code, usage, retryAfterMs }`.
  details?: Record<string, unknown>;

  constructor(status: number, message: string, details?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean; // send Authorization header when a token is present (default true)
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await res.json().catch(() => ({})) : undefined;

  if (res.status === 403 && payload?.details?.code === 'ACCOUNT_BANNED') {
    window.dispatchEvent(new Event(ACCOUNT_STANDING_EVENT));
  }

  if (res.status === 402 && payload?.details?.code === 'SUBSCRIPTION_REQUIRED') {
    window.dispatchEvent(new Event(SUBSCRIPTION_REQUIRED_EVENT));
  }

  if (!res.ok) {
    const message = (payload && (payload.error as string)) || `Request failed with status ${res.status}`;
    throw new ApiError(res.status, message, payload?.details);
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, auth = true) => request<T>(path, { method: 'GET', auth }),
  post: <T>(path: string, body?: unknown, auth = true) => request<T>(path, { method: 'POST', body, auth }),
  put: <T>(path: string, body?: unknown, auth = true) => request<T>(path, { method: 'PUT', body, auth }),
  del: <T>(path: string, auth = true) => request<T>(path, { method: 'DELETE', auth }),
};

/** Fetches an authenticated image (e.g. a feedback screenshot) as an object URL.
    An <img src> can't send the Authorization header, so it's fetched here first.
    The caller revokes the URL when done. */
export async function fetchImageUrl(path: string): Promise<string> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) throw new ApiError(res.status, "Couldn't load the image");
  return URL.createObjectURL(await res.blob());
}
