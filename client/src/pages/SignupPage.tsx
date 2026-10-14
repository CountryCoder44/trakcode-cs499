import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';
import ThemeToggle from '../components/ThemeToggle';
import SocialAuthButtons from '../components/SocialAuthButtons';
import PasswordInput from '../components/PasswordInput';
import TrakLogo from '../components/TrakLogo';

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("The passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      await signup(email, password, name);
      navigate('/onboarding');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Signup failed');
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
        <h2>Start your free trial</h2>
        <div className="notice-banner" role="note">
          Please create your account with email and password below. Google, GitHub and LinkedIn
          sign-in are turned off in this version because their OAuth keys were removed for privacy.
        </div>
        {error && <div className="error-banner">{error}</div>}
        <SocialAuthButtons />
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="name">Name</label>
            <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
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
            <label htmlFor="password">Password</label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <span className="text-faint" style={{ fontSize: 12 }}>
              At least 8 characters
            </span>
          </div>
          <div className="field">
            <label htmlFor="confirm-password">Confirm password</label>
            <PasswordInput
              id="confirm-password"
              autoComplete="new-password"
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
            {confirm && confirm !== password && (
              <span style={{ fontSize: 12, color: 'var(--danger)' }}>The passwords don't match.</span>
            )}
          </div>
          <button className="btn btn-primary btn-block" type="submit" disabled={submitting || (confirm !== '' && confirm !== password)}>
            {submitting ? <span className="spinner" /> : 'Create account'}
          </button>
        </form>
        <p style={{ marginTop: 16, textAlign: 'center' }}>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
