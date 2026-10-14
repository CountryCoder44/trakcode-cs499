import { useEffect, useState } from 'react';
import { adminApi } from '../../api/endpoints';
import { ApiError } from '../../api/client';
import type {
  AccountHistoryItem,
  SafetyIncident,
  SafetyView,
  SafetyIncidentList,
  SafetySeverity,
  UserIpReport,
} from '../../api/types';

// Admin, Safety: learner messages to Trak that the moderation check flagged.
// A person reviews every one; nothing is reported or actioned automatically.
// Incidents are kept permanently, even after the account is deleted.

const SEVERITY_BADGE: Record<SafetySeverity, string> = {
  low: 'badge-neutral',
  medium: 'badge-warning',
  high: 'badge-danger',
  critical: 'badge-danger',
};

function standingLabel(i: SafetyIncident): string | null {
  if (i.accountDeleted) return 'Account deleted';
  if (!i.standing) return null;
  return 'Banned';
}

const SAFETY_VIEWS: { id: SafetyView; label: string; empty: string; count: (r: SafetyIncidentList) => number }[] = [
  {
    id: 'open',
    label: 'To review',
    empty: "Nothing to review. Flags appear here when Trak's screening catches a message.",
    count: (r) => r.openCount,
  },
  {
    id: 'actioned',
    label: 'Action taken',
    empty: 'No flags with an action yet (warned, banned or reported).',
    count: (r) => r.actionedCount,
  },
  {
    id: 'closed',
    label: 'Closed, no action',
    empty: 'No flags were dismissed or closed without action yet.',
    count: (r) => r.closedCount,
  },
];

export default function SafetyTab({ onError }: { onError: (msg: string | null) => void }) {
  const [view, setView] = useState<SafetyView>('open');
  // The review queue hides low flags by default; past decisions show everything.
  const [minSeverity, setMinSeverity] = useState<SafetySeverity>('medium');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<SafetyIncidentList | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    setResult(null);
    adminApi
      .safetyIncidents({ view, minSeverity, page })
      .then(setResult)
      .catch((err) => onError(err instanceof ApiError ? err.message : 'Failed to load incidents'));
  }, [view, minSeverity, page, reloadKey, onError]);

  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;

  return (
    <div className="card">
      <h3>Safety review</h3>
      <p className="text-faint" style={{ marginTop: 0 }}>
        Messages to Trak flagged by the moderation check. High and critical flags were blocked and emailed to support.
        Nothing is reported to anyone unless you do it and record it here.
      </p>
      <div className="tabs safety-subtabs" role="tablist">
        {SAFETY_VIEWS.map((v) => (
          <button
            key={v.id}
            role="tab"
            aria-selected={view === v.id}
            className={`tab${view === v.id ? ' active' : ''}`}
            onClick={() => {
              setView(v.id);
              setMinSeverity(v.id === 'open' ? 'medium' : 'low');
              setPage(1);
              setOpenId(null);
            }}
          >
            {v.label}
            {result ? ` (${v.count(result)})` : ''}
          </button>
        ))}
      </div>
      <div className="flex gap-2" style={{ flexWrap: 'wrap', marginBottom: 12 }}>
        <select
          className="input"
          style={{ flex: '0 1 180px' }}
          value={minSeverity}
          onChange={(e) => {
            setMinSeverity(e.target.value as SafetySeverity);
            setPage(1);
          }}
          aria-label="Minimum severity"
        >
          <option value="low">Low and up</option>
          <option value="medium">Medium and up</option>
          <option value="high">High and up</option>
          <option value="critical">Critical only</option>
        </select>
      </div>

      {!result ? (
        <div className="spinner" />
      ) : result.items.length === 0 ? (
        <p className="text-faint">{SAFETY_VIEWS.find((v) => v.id === view)!.empty}</p>
      ) : (
        <div className="safety-list">
          {result.items.map((i) => (
            <IncidentRow
              key={i.id}
              incident={i}
              open={openId === i.id}
              onToggle={() => setOpenId(openId === i.id ? null : i.id)}
              onChanged={() => setReloadKey((k) => k + 1)}
              onError={onError}
            />
          ))}
        </div>
      )}

      {result && totalPages > 1 && (
        <div className="flex gap-2" style={{ alignItems: 'center', marginTop: 12 }}>
          <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span className="text-faint">
            Page {page} of {totalPages}
          </span>
          <button className="btn btn-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function IncidentRow({
  incident: i,
  open,
  onToggle,
  onChanged,
  onError,
}: {
  incident: SafetyIncident;
  open: boolean;
  onToggle: () => void;
  onChanged: () => void;
  onError: (msg: string | null) => void;
}) {
  const [notes, setNotes] = useState(i.reviewerNotes ?? '');
  const [busy, setBusy] = useState(false);
  const [ips, setIps] = useState<UserIpReport | null>(null);
  const [history, setHistory] = useState<AccountHistoryItem[] | null>(null);

  // The account's other flags and past warnings, loaded when the row opens.
  useEffect(() => {
    if (!open || history) return;
    adminApi
      .userHistory(i.userId)
      .then((r) => setHistory(r.incidents))
      .catch(() => onError('Could not load the account history'));
  }, [open, history, i.userId, onError]);

  const selfHarmOnly = i.categories.length > 0 && i.categories.every((c) => c === 'self-harm');
  const [reportedTo, setReportedTo] = useState('');
  const [reference, setReference] = useState('');
  const standing = standingLabel(i);

  async function act(status: 'dismissed' | 'reviewed', action?: 'warn' | 'ban' | 'restore', confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    onError(null);
    try {
      await adminApi.reviewIncident(i.id, {
        status,
        notes: notes || undefined,
        action,
      });
      onChanged();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Could not save the review');
    } finally {
      setBusy(false);
    }
  }

  async function toggleHold() {
    setBusy(true);
    onError(null);
    try {
      await adminApi.setLegalHold(i.id, !i.legalHold);
      onChanged();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Could not change the legal hold');
    } finally {
      setBusy(false);
    }
  }

  async function saveReport() {
    if (!reportedTo.trim()) return;
    setBusy(true);
    onError(null);
    try {
      await adminApi.recordReport(i.id, { reportedTo: reportedTo.trim(), reference: reference.trim() || undefined });
      onChanged();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Could not record the report');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`safety-row${open ? ' open' : ''}`}>
      <button className="safety-row-head" onClick={onToggle} aria-expanded={open}>
        <span className={`badge ${SEVERITY_BADGE[i.severity]}`}>{i.severity}</span>
        <span className="safety-row-cats">{i.categories.join(', ')}</span>
        <span className="safety-row-who">{i.userEmail}</span>
        {i.blocked && <span className="badge badge-neutral">blocked</span>}
        {i.status !== 'open' && <span className="badge badge-neutral">{i.status}</span>}
        {standing && <span className="badge badge-danger">{standing}</span>}
        <span className="text-faint safety-row-date">{new Date(i.createdAt).toLocaleString()}</span>
      </button>
      {open && (
        <div className="safety-row-body">
          <AccountHistory history={history} currentId={i.id} />
          <p style={{ marginTop: 0 }}>
            <strong>Why flagged:</strong> {i.rationale || '(no reason given)'}
          </p>
          {i.recentContext.length > 0 && (
            <div className="safety-context">
              {i.recentContext.map((m, k) => (
                <p key={k}>
                  <strong>{m.role === 'trak' ? 'Trak' : 'Learner'}:</strong> {m.content}
                </p>
              ))}
            </div>
          )}
          <div className="safety-message">
            <strong>Flagged message:</strong>
            <p style={{ whiteSpace: 'pre-wrap', margin: '4px 0 0' }}>{i.message}</p>
          </div>
          <p className="text-faint" style={{ fontSize: 13 }}>
            {i.userName ? `${i.userName} · ` : ''}
            {i.incidentsForUser} incident{i.incidentsForUser === 1 ? '' : 's'} on this account · IP {i.ip ?? 'unknown'}{' '}
            · in {i.contextType}
            {i.action !== 'none' ? ` · action taken: ${i.action}` : ''}
            {i.reportedTo ? ` · reported to ${i.reportedTo}${i.reportReference ? ` (${i.reportReference})` : ''}` : ''}
            {i.legalHold ? ' · on legal hold' : ''}
          </p>

          {!i.accountDeleted && (
            <p style={{ fontSize: 13 }}>
              {ips ? (
                <>
                  Addresses used:{' '}
                  {ips.ips.map((r) => `${r.ip} (${r.count}×, ${r.events.join('/')})`).join(', ') || 'none recorded'}
                  {ips.sharedWith.length > 0 && (
                    <>
                      <br />
                      Other accounts at these addresses: {ips.sharedWith.map((s) => `${s.email} (${s.ip})`).join(', ')}
                    </>
                  )}
                </>
              ) : (
                <button
                  className="btn btn-sm"
                  onClick={() =>
                    adminApi
                      .userIps(i.userId)
                      .then(setIps)
                      .catch(() => onError('Could not load IP addresses'))
                  }
                >
                  Show IP addresses
                </button>
              )}
            </p>
          )}

          <label className="safety-label" htmlFor={`notes-${i.id}`}>
            Reviewer notes
          </label>
          <textarea
            id={`notes-${i.id}`}
            className="input"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What you decided and why"
          />
          <div className="flex gap-2" style={{ flexWrap: 'wrap', marginTop: 8, alignItems: 'center' }}>
            <button className="btn btn-sm" disabled={busy} onClick={() => act('dismissed')}>
              Dismiss (not a problem)
            </button>
            <button className="btn btn-sm" disabled={busy} onClick={() => act('reviewed')}>
              Mark reviewed
            </button>
            {!selfHarmOnly && !i.accountDeleted && (
              <button
                className="btn btn-sm"
                disabled={busy || i.action === 'warned'}
                title="Emails the learner and shows them a one-time notice"
                onClick={() =>
                  act('reviewed', 'warn', `Warn ${i.userEmail}? They'll get an email and a notice in the app.`)
                }
              >
                {i.action === 'warned' ? 'Warned' : 'Warn the learner'}
              </button>
            )}
            {!i.accountDeleted && (
              <>
                <button
                  className="btn btn-sm btn-danger"
                  disabled={busy}
                  onClick={() =>
                    act(
                      'reviewed',
                      'ban',
                      `Ban ${i.userEmail}? This closes the account, cancels any membership, and blocks this email from signing up again.`,
                    )
                  }
                >
                  Ban
                </button>
                {i.standing && (
                  <button
                    className="btn btn-sm"
                    disabled={busy}
                    onClick={() => act('reviewed', 'restore', `Restore ${i.userEmail}?`)}
                  >
                    Restore account
                  </button>
                )}
              </>
            )}
          </div>

          <div className="safety-report">
            <strong style={{ fontSize: 13 }}>Record a report you made</strong>
            <div className="flex gap-2" style={{ flexWrap: 'wrap', marginTop: 6 }}>
              <input
                className="input"
                style={{ flex: '1 1 200px' }}
                placeholder="Reported to (e.g. NCMEC CyberTipline, local police)"
                value={reportedTo}
                onChange={(e) => setReportedTo(e.target.value)}
              />
              <input
                className="input"
                style={{ flex: '1 1 140px' }}
                placeholder="Reference number"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
              <button className="btn btn-sm" disabled={busy || !reportedTo.trim()} onClick={saveReport}>
                Save
              </button>
            </div>
            <div className="text-faint" style={{ fontSize: 12, marginTop: 8 }}>
              Kept 90 days after review if no action, 3 years after a warning, ban or report.{' '}
              <button type="button" className="btn-link" disabled={busy} onClick={toggleHold}>
                {i.legalHold ? 'Release legal hold' : 'Put on legal hold (keep until released)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

// Warnings already given to this account (the playbook: warn, then ban) and
// every other flag on it, newest first.
function AccountHistory({ history, currentId }: { history: AccountHistoryItem[] | null; currentId: string }) {
  if (!history)
    return (
      <p className="text-faint" style={{ marginTop: 12 }}>
        Loading account history...
      </p>
    );
  const warnings = history.filter((h) => h.action === 'warned');
  const others = history.filter((h) => h.id !== currentId);
  return (
    <div className="safety-history">
      <p style={{ margin: 0 }}>
        {warnings.length === 0 ? (
          <strong>No previous warnings.</strong>
        ) : (
          <>
            <strong className="text-danger">
              Warned {warnings.length} time{warnings.length === 1 ? '' : 's'}:
            </strong>{' '}
            {warnings.map((w) => fmtDate(w.reviewedAt ?? w.createdAt)).join(', ')}
          </>
        )}
      </p>
      {others.length > 0 && (
        <details>
          <summary>
            {others.length} other flag{others.length === 1 ? '' : 's'} on this account
          </summary>
          <ul>
            {others.map((h) => (
              <li key={h.id}>
                {fmtDate(h.createdAt)} · {h.severity} · {h.categories.join(', ')} ·{' '}
                {h.action === 'warned'
                  ? `warned ${h.reviewedAt ? fmtDate(h.reviewedAt) : ''}`
                  : h.action === 'banned'
                    ? 'banned'
                    : h.status === 'open'
                      ? 'not reviewed yet'
                      : h.status}
                {h.reviewerNotes ? ` · notes: ${h.reviewerNotes}` : ''}
                <div className="text-faint">{h.message}</div>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
