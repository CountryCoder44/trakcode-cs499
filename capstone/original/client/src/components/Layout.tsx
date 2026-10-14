import { NavLink, Outlet, useLocation, useNavigate, matchPath } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';

// Routes that host the dockable chat|editor workspace shell (§2 of the
// dockable-layout plan) need real width to be usable — everything else
// keeps the original 1080px reading-width `.container`.
const WORKSPACE_ROUTE_PATTERNS = ['/practice/workspace/:problemId', '/learn/:stack/:itemId', '/practice/flash'];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isWorkspaceRoute = WORKSPACE_ROUTE_PATTERNS.some((pattern) => matchPath(pattern, location.pathname));

  return (
    <div className="app-shell">
      <nav className="topnav">
        <div className="topnav-inner">
          <NavLink to="/dashboard" className="brand">
            <span className="brand-mark" />
            TrakCode
          </NavLink>
          <div className="nav-links">
            <NavLink to="/dashboard" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              Dashboard
            </NavLink>
            <NavLink to="/learn" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              Learn
            </NavLink>
            <NavLink to="/practice" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              Practice
            </NavLink>
            <NavLink to="/roadmap" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              Roadmap
            </NavLink>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {user ? (
              <>
                <NavLink to="/settings/profile" className="nav-link">
                  Profile
                </NavLink>
                {user.role === 'admin' && (
                  <NavLink to="/admin" className="nav-link">
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
          </div>
        </div>
      </nav>
      <main className={isWorkspaceRoute ? 'main main-workspace' : 'main'}>
        <div className={isWorkspaceRoute ? 'container-wide' : 'container'}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
