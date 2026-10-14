import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { landingPathFor } from '../utils/landing';
import ThemeToggle from '../components/ThemeToggle';

// Landing spot after social sign-in. The server redirects here with everything in
// the URL fragment (#token=…&new=1, or #error=…) so the session token never shows
// up in a server log or a Referer header. We read it once, wipe it from the
// address bar, and move on.
export default function OAuthCallbackPage() {
  const { loginWithToken, user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [returnTo, setReturnTo] = useState<string | null>(null);
  const handled = useRef(false);

  useEffect(() => {
    // StrictMode runs effects twice in dev; the fragment is wiped after the first.
    if (handled.current) return;
    handled.current = true;

    const params = new URLSearchParams(window.location.hash.slice(1));
    window.history.replaceState(null, '', window.location.pathname);

    const safeReturn = params.get('returnTo');
    const target = safeReturn && safeReturn.startsWith('/') && !safeReturn.startsWith('//') ? safeReturn : null;
    setReturnTo(target);

    const err = params.get('error');
    const token = params.get('token');
    if (err || !token) {
      setError(err ?? 'Sign-in did not complete. Please try again.');
      return;
    }

    loginWithToken(token)
      .then((signedIn) => navigate(target ?? landingPathFor(signedIn), { replace: true }))
      .catch(() => setError('Sign-in did not complete. Please try again.'));
  }, [loginWithToken, navigate]);

  return (
    <div className="container-narrow" style={{ paddingTop: 80 }}>
      <div style={{ position: 'fixed', top: 20, right: 24 }}>
        <ThemeToggle />
      </div>
      <div className="card text-center" style={{ maxWidth: 400, margin: '0 auto' }}>
        {error ? (
          <>
            <h2>Couldn't sign you in</h2>
            <div className="error-banner">{error}</div>
            {/* A failed connect from inside the app goes back where it started. */}
            {user && returnTo ? (
              <Link to={returnTo} className="btn btn-block">
                Go back
              </Link>
            ) : (
              <Link to="/login" className="btn btn-primary btn-block">
                Back to log in
              </Link>
            )}
          </>
        ) : (
          <>
            <span className="spinner" />
            <p className="text-faint" style={{ marginTop: 12 }}>
              Signing you in…
            </p>
          </>
        )}
      </div>
    </div>
  );
}
