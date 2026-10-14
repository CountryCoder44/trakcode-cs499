import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

// Keeps tabs that were left open from running an old release. The build id is
// compiled in (vite.config.ts) and also published at /version.json (served
// no-cache by Caddy). When the published id changes, the tab reloads on the
// learner's next page change, so nothing they're typing on the current page is
// thrown away, and shows a small prompt to reload sooner.

const CHECK_EVERY_MS = 5 * 60 * 1000;
const RELOAD_GUARD_KEY = 'trakcode_chunk_reload';

async function publishedBuildId(): Promise<string | null> {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const body = (await res.json()) as { id?: unknown };
    return typeof body.id === 'string' ? body.id : null;
  } catch {
    return null;
  }
}

export default function UpdateWatcher() {
  const [stale, setStale] = useState(false);
  const location = useLocation();
  const firstPath = useRef(location.pathname);

  useEffect(() => {
    if (__BUILD_ID__ === 'dev') return;
    let alive = true;
    const check = async () => {
      const id = await publishedBuildId();
      if (alive && id && id !== __BUILD_ID__) setStale(true);
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check();
    };
    void check();
    const timer = window.setInterval(check, CHECK_EVERY_MS);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // A page's code chunk can disappear after a deploy (its hashed file name
  // changed). Vite reports that as vite:preloadError; reload once to pick up the
  // new release instead of showing a broken page.
  useEffect(() => {
    const onPreloadError = (e: Event) => {
      try {
        if (sessionStorage.getItem(RELOAD_GUARD_KEY)) return;
        sessionStorage.setItem(RELOAD_GUARD_KEY, '1');
      } catch {
        /* storage unavailable: still reload once */
      }
      e.preventDefault();
      window.location.reload();
    };
    window.addEventListener('vite:preloadError', onPreloadError);
    try {
      sessionStorage.removeItem(RELOAD_GUARD_KEY);
    } catch {
      /* ignore */
    }
    return () => window.removeEventListener('vite:preloadError', onPreloadError);
  }, []);

  // Newer release known: the next page change becomes a full load.
  useEffect(() => {
    if (stale && location.pathname !== firstPath.current) window.location.reload();
    firstPath.current = location.pathname;
  }, [location.pathname, stale]);

  if (!stale) return null;
  return (
    <div className="update-toast" role="status">
      <span>A new version of TrakCode is ready.</span>
      <button type="button" className="btn btn-primary btn-sm" onClick={() => window.location.reload()}>
        Reload
      </button>
    </div>
  );
}
