import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { landingPathFor } from '../utils/landing';
import PublicLayout from '../components/PublicLayout';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  // A still-logged-in user landing here (clicked the logo, or bounced back by
  // ProtectedRoute during a momentary auth hiccup) shouldn't be shown the
  // marketing page again — that reads as "you're logged out," which they
  // aren't.
  useEffect(() => {
    if (!loading && user) navigate(landingPathFor(user), { replace: true });
  }, [loading, user, navigate]);

  return (
    <PublicLayout>
      <div className="container-narrow text-center" style={{ paddingTop: 64 }}>
        <div className="badge badge-accent" style={{ marginBottom: 20 }}>
          Learn Python · Java · C++
        </div>
        <h1 style={{ fontSize: 42, lineHeight: 1.15 }}>
          Learn to code by actually <span style={{ color: 'var(--accent-hover)' }}>writing code</span>.
        </h1>
        <p style={{ fontSize: 17, marginBottom: 32 }}>
          Real execution, not AI guesswork. A Socratic AI tutor that never just hands you the answer. A skill tree
          that unlocks as you learn, and a portfolio that builds itself as you solve.
        </p>

        <div className="flex items-center justify-between gap-3" style={{ justifyContent: 'center', marginBottom: 24 }}>
          <Link to="/signup" className="btn btn-primary">
            Start free trial
          </Link>
        </div>

        <div className="grid grid-3" style={{ marginTop: 64, textAlign: 'left' }}>
          <div className="card">
            <h3>Learn Mode</h3>
            <p>A checklist skill tree, unlocked by prerequisites, so you never have to guess what to study next.</p>
          </div>
          <div className="card">
            <h3>Practice Mode</h3>
            <p>Hands-on assignments sized to what you've learned, checked by real code execution.</p>
          </div>
          <div className="card">
            <h3>AI Tutor</h3>
            <p>Trak guides you with hints instead of handing over the answer, so you actually learn the fix.</p>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
