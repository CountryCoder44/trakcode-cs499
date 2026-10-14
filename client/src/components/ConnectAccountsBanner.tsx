import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { profileApi } from '../api/endpoints';
import type { OAuthProvider } from '../api/types';
import { ProviderIcon, useAuthProviders } from './SocialAuthButtons';

// The accounts the dashboard nudges learners to connect. Only ones the server
// actually has keys for are ever mentioned.
const NUDGED: OAuthProvider[] = ['github', 'linkedin'];
const LABELS: Record<OAuthProvider, string> = { google: 'Google', github: 'GitHub', linkedin: 'LinkedIn' };

/**
 * Dashboard reminder to connect GitHub / LinkedIn, whatever the learner signed
 * up with. "Go to profile" leads to the Connected accounts card; "Don't show
 * this again" is saved on the account, so it stays gone on every device.
 */
export default function ConnectAccountsBanner() {
  const { user, refreshUser } = useAuth();
  const configured = useAuthProviders();
  const [hidden, setHidden] = useState(false);

  if (!user || configured === null || hidden || user.dismissedPrompts.includes('connect-accounts')) return null;

  const linked = new Set(user.identities.map((i) => i.provider));
  const missing = NUDGED.filter(
    (p) =>
      configured.some((c) => c.id === p) &&
      // Connected without a working token (GitHub linked before push access,
      // or an expired LinkedIn posting token) still counts as missing.
      (!linked.has(p) ||
        (p === 'github' && !user.githubPortfolioConnected) ||
        (p === 'linkedin' && !user.linkedinSharingConnected))
  );
  if (missing.length === 0) return null;

  const names = missing.map((p) => LABELS[p]).join(' and ');
  const reasons: Record<string, string> = {
    github: 'push your passing solutions to your GitHub profile',
    linkedin: 'share your milestones on LinkedIn',
  };
  const why = `Connect to ${missing.map((p) => reasons[p]).join(', and ')}.`;

  async function dismiss() {
    setHidden(true);
    try {
      await profileApi.dismissPrompt('connect-accounts');
      await refreshUser();
    } catch {
      // Hidden for this visit either way; it can reappear next time if saving failed.
    }
  }

  return (
    <div className="connect-banner" role="status">
      <div className="connect-banner-icons">
        {missing.map((p) => (
          <ProviderIcon key={p} provider={p} size={24} />
        ))}
      </div>
      <div className="connect-banner-text">
        <strong>Connect your {names} account{missing.length > 1 ? 's' : ''}</strong>
        <div className="text-dim" style={{ fontSize: 14 }}>
          {why}
        </div>
      </div>
      <div className="connect-banner-actions">
        <button className="btn btn-sm" onClick={dismiss}>
          Don't show this again
        </button>
        <Link to="/settings/profile" className="btn btn-sm btn-primary">
          Go to profile
        </Link>
      </div>
    </div>
  );
}
