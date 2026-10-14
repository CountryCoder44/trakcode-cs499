import { useState } from 'react';
import { profileApi } from '../api/endpoints';
import type { User } from '../api/types';

// A misuse warning from a safety review, shown once over the app until the
// learner presses "I understand". The same warning was also emailed.
export default function WarningNotice({
  warning,
  onAcknowledged,
}: {
  warning: NonNullable<User['warning']>;
  onAcknowledged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const when = new Date(warning.flaggedAt).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  async function acknowledge() {
    setBusy(true);
    try {
      await profileApi.acknowledgeWarning();
    } finally {
      onAcknowledged();
    }
  }

  return (
    <div className="console-popup-backdrop">
      <div className="console-popup skip-trial" role="alertdialog" aria-modal="true" aria-labelledby="warning-title">
        <div className="console-popup-header">
          <strong id="warning-title">A warning about your use of Trak</strong>
        </div>
        <div className="skip-trial-body">
          <p style={{ marginTop: 0 }}>
            On {when}, you sent Trak a message that our team reviewed and found breaks our Terms of Service:{' '}
            <strong>{warning.reason}</strong>.
          </p>
          <p>
            This is a warning. Please keep your conversations with Trak about learning to code. If it happens again, we
            may close your account, and a closed account isn't refunded.
          </p>
          <p className="text-faint" style={{ fontSize: 13 }}>
            <a href="/terms" target="_blank" rel="noreferrer">
              Terms of Service
            </a>
            {' · '}Think we got this wrong? Email <a href="mailto:support@trakcode.com">support@trakcode.com</a>.
          </p>
          <button className="btn btn-primary" onClick={acknowledge} disabled={busy}>
            I understand
          </button>
        </div>
      </div>
    </div>
  );
}
