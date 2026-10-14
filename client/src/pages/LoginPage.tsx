import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { landingPathFor } from '../utils/landing';
import { ApiError } from '../api/client';
import ThemeToggle from '../components/ThemeToggle';
import SocialAuthButtons from '../components/SocialAuthButtons';
import PasswordInput from '../components/PasswordInput';
import TrakLogo from '../components/TrakLogo';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const signedIn = await login(email, password);
      navigate(landingPathFor(signedIn));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
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
        <h2>Log in</h2>
        {error && <div className="error-banner">{error}</div>}
        <SocialAuthButtons />
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <div className="flex justify-between items-center">
              <label htmlFor="password">Password</label>
              <Link to="/forgot-password" style={{ fontSize: 13 }}>
                Forgot password?
              </Link>
            </div>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
            {submitting ? <span className="spinner" /> : 'Log in'}
          </button>
        </form>
        <p style={{ marginTop: 16, textAlign: 'center' }}>
          No account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
