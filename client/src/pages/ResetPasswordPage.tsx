import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { landingPathFor } from '../utils/landing';
import ThemeToggle from '../components/ThemeToggle';
import PasswordInput from '../components/PasswordInput';
import TrakLogo from '../components/TrakLogo';

// Landing spot for the emailed reset link. The token arrives in the URL
// fragment (#token=…), which browsers never send to a server; it's read once
// and wiped from the address bar.
export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const tokenRef = useRef<string | null>(null);
  const [hasToken, setHasToken] = useState(true);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (tokenRef.current) return;
    const token = new URLSearchParams(window.location.hash.slice(1)).get('token');
    window.history.replaceState(null, '', window.location.pathname);
    tokenRef.current = token;
    setHasToken(Boolean(token));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("The passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      const { token } = await authApi.resetPassword({ token: tokenRef.current!, password });
      const user = await loginWithToken(token);
      navigate(landingPathFor(user), { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="container-narrow" style={{ paddingTop: 80 }}>
      <div style={{ position: 'fixed', top: 20, right: 24 }}>
        <ThemeToggle />
      </div>
      <div className="text-center" style={{ marginBottom: 32 }}>
        <Link to="/" className="brand" style={{ justifyContent: 'center' }}>
          <TrakLogo height={64} />
        </Link>
      </div>
      <div className="card" style={{ maxWidth: 400, margin: '0 auto' }}>
        <h2>Choose a new password</h2>
        {!hasToken ? (
          <>
            <div className="error-banner">This page needs the link from your reset email.</div>
            <Link to="/forgot-password" className="btn btn-block">
              Send me a new link
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="error-banner">
                {error}{' '}
                {/expired|invalid/i.test(error) && <Link to="/forgot-password">Send a new link</Link>}
              </div>
            )}
            <div className="field">
              <label htmlFor="password">New password</label>
              <PasswordInput id="password" autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
            </div>
            <div className="field">
              <label htmlFor="confirm">Type it again</label>
              <PasswordInput id="confirm" autoComplete="new-password" minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </div>
            <p className="text-faint" style={{ fontSize: 13 }}>At least 8 characters.</p>
            <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
              {submitting ? <span className="spinner" /> : 'Save and log in'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
