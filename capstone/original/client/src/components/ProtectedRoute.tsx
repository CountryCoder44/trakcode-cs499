import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="container">
        <div className="empty-state">
          <span className="spinner" />
        </div>
      </div>
    );
  }

  // Home, not /login — the landing page has both the login link *and* the
  // demo-code redemption field, so a signed-out user (session expired, or
  // their account no longer exists on a reset dev DB) always lands
  // somewhere they can actually get back in.
  if (!user) return <Navigate to="/" replace />;

  return <>{children}</>;
}
