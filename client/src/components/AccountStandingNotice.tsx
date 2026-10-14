import { Link } from 'react-router-dom';
import type { AccountStanding } from '../api/types';

// Shown in place of the app for an account an admin banned after reviewing a
// safety incident. Profile and Billing stay reachable, so the learner can still
// see their billing history or delete the account.
export default function AccountStandingNotice({ standing: _standing }: { standing: NonNullable<AccountStanding> }) {
  return (
    <div className="card standing-notice">
      <h1 style={{ marginTop: 0 }}>This account has been closed</h1>
      <p>
        After reviewing activity on this account, we closed it for breaking our Terms of Service. Any membership has
        been cancelled.
      </p>
      <p>
        If you think this is a mistake, email <a href="mailto:support@trakcode.com">support@trakcode.com</a>.
      </p>
      <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
        <Link className="btn" to="/billing">
          Billing
        </Link>
        <Link className="btn" to="/settings/profile">
          Profile and account
        </Link>
        <a className="btn" href="/terms" target="_blank" rel="noreferrer">
          Terms of Service
        </a>
      </div>
    </div>
  );
}
