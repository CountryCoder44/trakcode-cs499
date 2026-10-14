import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import ThemeToggle from '../components/ThemeToggle';
import TrakLogo from '../components/TrakLogo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { message } = await authApi.forgotPassword(email.trim());
      setSent(message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
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
        <h2>Reset your password</h2>
        {sent ? (
          <>
            <p>{sent}</p>
            <p className="text-dim" style={{ fontSize: 14 }}>
              The link expires in 30 minutes. Check your spam folder if it doesn't arrive in a few minutes.
            </p>
            <Link to="/login" className="btn btn-block">
              Back to log in
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="text-dim" style={{ fontSize: 14 }}>
              Enter the email you use for TrakCode and we'll send you a link to choose a new password.
            </p>
            {error && <div className="error-banner">{error}</div>}
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </div>
            <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
              {submitting ? <span className="spinner" /> : 'Send reset link'}
            </button>
            <p style={{ marginTop: 16, textAlign: 'center' }}>
              <Link to="/login">Back to log in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
