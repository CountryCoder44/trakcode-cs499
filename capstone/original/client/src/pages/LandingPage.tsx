import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';
import ThemeToggle from '../components/ThemeToggle';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, loading, redeemDemoCode } = useAuth();
  const [demoCode, setDemoCode] = useState('');
  const [showDemoField, setShowDemoField] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // A still-logged-in user landing here (clicked the logo, or bounced back by
  // ProtectedRoute during a momentary auth hiccup) shouldn't be shown the
  // marketing page and a demo-code field again — that reads as "you're
  // logged out," which they aren't.
  useEffect(() => {
    if (!loading && user) navigate('/dashboard', { replace: true });
  }, [loading, user, navigate]);

  async function handleRedeemDemo(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await redeemDemoCode(demoCode.trim());
      navigate('/onboarding');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not redeem that code');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app-shell">
      <nav className="topnav">
        <div className="topnav-inner">
          <Link to="/" className="brand">
            <span className="brand-mark" />
            TrakCode
          </Link>
          <div className="nav-links" />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link to="/login" className="nav-link">
              Log in
            </Link>
            <Link to="/signup" className="btn btn-sm btn-primary">
              Sign up
            </Link>
          </div>
        </div>
      </nav>

      <main className="main">
        <div className="container-narrow text-center" style={{ paddingTop: 64 }}>
          <div className="badge badge-accent" style={{ marginBottom: 20 }}>
            Learn Python · MERN · C++
          </div>
          <h1 style={{ fontSize: 42, lineHeight: 1.15 }}>
            Learn to code by actually <span style={{ color: 'var(--accent-hover)' }}>writing code</span>.
          </h1>
          <p style={{ fontSize: 17, marginBottom: 32 }}>
            Real execution, not AI guesswork. A Socratic AI tutor that never just hands you the answer. A skill tree
            that unlocks as you learn — and a portfolio that builds itself as you solve.
          </p>

          <div className="flex items-center justify-between gap-3" style={{ justifyContent: 'center', marginBottom: 24 }}>
            <Link to="/signup" className="btn btn-primary">
              Start free trial
            </Link>
            <button className="btn" onClick={() => setShowDemoField((s) => !s)}>
              Have a demo code?
            </button>
          </div>

          {showDemoField && (
            <form onSubmit={handleRedeemDemo} className="card" style={{ maxWidth: 360, margin: '0 auto' }}>
              {error && <div className="error-banner">{error}</div>}
              <div className="field">
                <label htmlFor="demoCode">Demo code</label>
                <input
                  id="demoCode"
                  className="input"
                  placeholder="e.g. CS4900-PROF"
                  value={demoCode}
                  onChange={(e) => setDemoCode(e.target.value)}
                  required
                />
              </div>
              <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
                {submitting ? <span className="spinner" /> : 'Redeem code'}
              </button>
            </form>
          )}

          <div className="grid grid-3" style={{ marginTop: 64, textAlign: 'left' }}>
            <div className="card">
              <h3>Learn Mode</h3>
              <p>A checklist skill tree, unlocked by prerequisites — never guess what to study next.</p>
            </div>
            <div className="card">
              <h3>Practice Mode</h3>
              <p>Deep-dive problems and rapid-fire flash cards, checked by real code execution.</p>
            </div>
            <div className="card">
              <h3>AI Tutor</h3>
              <p>Trak guides you with hints, never the answer — you actually learn the fix.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
