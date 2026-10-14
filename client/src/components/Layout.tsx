import { useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, matchPath } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ACCOUNT_STANDING_EVENT, SUBSCRIPTION_REQUIRED_EVENT } from '../api/client';
import AccountStandingNotice from './AccountStandingNotice';
import WarningNotice from './WarningNotice';
import ThemeToggle from './ThemeToggle';
import TopNav from './TopNav';
import { PublicFooter } from './PublicLayout';
import FeedbackWidget from './FeedbackWidget';
import MessagesButton from './MessagesButton';

// Routes that host the dockable chat|editor workspace shell (§2 of the
// dockable-layout plan) need real width to be usable — everything else
// keeps the original 1080px reading-width `.container`.
const WORKSPACE_ROUTE_PATTERNS = [
  '/practice/workspace/:problemId',
  '/practice/attempt/:attemptId',
  '/practice/flash',
  '/course/:course/:topicId',
];

export default function Layout() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isWorkspaceRoute = WORKSPACE_ROUTE_PATTERNS.some((pattern) => matchPath(pattern, location.pathname));

  // The API answers 402 when a paid feature needs a subscription or trial.
  useEffect(() => {
    const toBilling = () => navigate('/billing');
    window.addEventListener(SUBSCRIPTION_REQUIRED_EVENT, toBilling);
    return () => window.removeEventListener(SUBSCRIPTION_REQUIRED_EVENT, toBilling);
  }, [navigate]);

  // A 403 for a banned account: reload the user so the notice shows.
  useEffect(() => {
    const reload = () => void refreshUser();
    window.addEventListener(ACCOUNT_STANDING_EVENT, reload);
    return () => window.removeEventListener(ACCOUNT_STANDING_EVENT, reload);
  }, [refreshUser]);

  // Billing and Profile stay open so a banned learner can manage
  // their membership or delete their account.
  const standingBlocks =
    user?.standing && !['/billing', '/settings'].some((p) => location.pathname.startsWith(p));

  return (
    <div className="app-shell">
      {user?.warning && !user.standing && (
        <WarningNotice warning={user.warning} onAcknowledged={() => void refreshUser()} />
      )}
      <TopNav
        homeTo="/dashboard"
        links={
          <>
            <NavLink to="/dashboard" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              Dashboard
            </NavLink>
            <NavLink
              to="/courses"
              className={({ isActive }) =>
                `nav-link${isActive || location.pathname.startsWith('/course/') ? ' active' : ''}`
              }
            >
              Learn
            </NavLink>
            <NavLink to="/practice" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              Practice
            </NavLink>
            <NavLink to="/roadmap" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              Roadmap
            </NavLink>
          </>
        }
        pinned={user ? <MessagesButton /> : undefined}
        actions={
          <>
            <ThemeToggle />
            {user ? (
              <>
                <MessagesButton className="messages-button-wide" />
                <NavLink to="/settings/profile" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                  Profile
                </NavLink>
                {user.role === 'admin' && (
                  <NavLink to="/admin" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                    Admin
                  </NavLink>
                )}
                <button
                  className="btn btn-sm"
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className="nav-link">
                  Log in
                </NavLink>
                <NavLink to="/signup" className="btn btn-sm btn-primary">
                  Sign up
                </NavLink>
              </>
            )}
          </>
        }
      />
      <main className={isWorkspaceRoute ? 'main main-workspace' : 'main'}>
        <div className={isWorkspaceRoute ? 'container-wide' : 'container'}>
          {standingBlocks && user?.standing ? <AccountStandingNotice standing={user.standing} /> : <Outlet />}
        </div>
      </main>
      {location.pathname === '/dashboard' && <PublicFooter />}
      {user && <FeedbackWidget />}
    </div>
  );
}
