import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import TopNav from './TopNav';

// The public info pages anyone can open without signing in.
export const PUBLIC_PAGES = [
  { path: '/pricing', label: 'Pricing' },
  { path: '/terms', label: 'Terms' },
  { path: '/privacy', label: 'Privacy' },
  { path: '/refunds', label: 'Cancellations & refunds' },
  { path: '/contact', label: 'Contact' },
] as const;

/** Top nav + footer shared by the landing page and the public info pages. */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <TopNav
        homeTo="/"
        links={
          <Link to="/pricing" className="nav-link">
            Pricing
          </Link>
        }
        actions={
          <>
            <ThemeToggle />
            <Link to="/login" className="nav-link">
              Log in
            </Link>
            <Link to="/signup" className="btn btn-sm btn-primary">
              Sign up
            </Link>
          </>
        }
      />

      <main className="main">{children}</main>

      <PublicFooter />
    </div>
  );
}

/** The footer bar: copyright and the public pages. Also shown on the dashboard. */
export function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="public-footer-inner">
        <span className="text-faint">© {new Date().getFullYear()} TrakCode LLC</span>
        <nav className="public-footer-links">
          {PUBLIC_PAGES.map((p) => (
            <Link key={p.path} to={p.path}>
              {p.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
