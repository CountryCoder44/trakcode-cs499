import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import TrakLogo from './TrakLogo';

// The top bar shared by the app (Layout) and the public pages (PublicLayout).
// On wide screens `links` sit after the logo and `actions` on the right, all in
// one row. On phones (max-width 720px) both collapse behind a menu button and
// open as a drop-down panel, which closes again on any navigation.
export default function TopNav({
  homeTo,
  links,
  actions,
  pinned,
}: {
  homeTo: string;
  links: ReactNode;
  actions: ReactNode;
  /** Shown beside the menu button on phones, so it stays visible when the
      menu is closed (e.g. the Messages icon). Hidden on wide screens, where
      the same control should also be passed in `actions`. */
  pinned?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <nav className={`topnav${open ? ' topnav-open' : ''}`}>
      <div className="topnav-inner">
        <Link to={homeTo} className="brand">
          <TrakLogo />
        </Link>
        {pinned && <div className="nav-pinned">{pinned}</div>}
        <button
          type="button"
          className="nav-toggle"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="topnav-menu"
          onClick={() => setOpen((o) => !o)}
        >
          <span aria-hidden="true">{open ? '✕' : '☰'}</span>
        </button>
        <div className="nav-collapse" id="topnav-menu">
          <div className="nav-links">{links}</div>
          <div className="nav-actions">{actions}</div>
        </div>
      </div>
    </nav>
  );
}
