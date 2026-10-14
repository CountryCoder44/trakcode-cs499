import { useCallback, useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { feedbackApi } from '../api/endpoints';

/** Fired after sending feedback or opening a message, so the badge refreshes now. */
export const MESSAGES_CHANGED_EVENT = 'trakcode:messages-changed';

const POLL_MS = 60_000;

function EnvelopeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Messages icon in the top bar, with a count of unread replies (the automatic
// "we got your feedback" note and anything the team writes back). Checks every
// minute while the tab is visible, when the tab comes back into view, and right
// after feedback is sent or a message is opened.
export default function MessagesButton({ className = '' }: { className?: string }) {
  const [unread, setUnread] = useState(0);
  const location = useLocation();

  const refresh = useCallback(() => {
    feedbackApi
      .unread()
      .then((r) => setUnread(r.unread))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, POLL_MS);
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener(MESSAGES_CHANGED_EVENT, refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener(MESSAGES_CHANGED_EVENT, refresh);
    };
  }, [refresh]);

  // Opening a thread marks it read; refresh when leaving or moving between them.
  useEffect(() => {
    if (location.pathname.startsWith('/messages')) refresh();
  }, [location.pathname, refresh]);

  const label = unread > 0 ? `Messages, ${unread} unread` : 'Messages';
  return (
    <NavLink
      to="/messages"
      className={({ isActive }) => `messages-button${isActive ? ' active' : ''} ${className}`.trim()}
      aria-label={label}
      title={label}
    >
      <EnvelopeIcon />
      {unread > 0 && <span className="messages-badge">{unread > 9 ? '9+' : unread}</span>}
    </NavLink>
  );
}
