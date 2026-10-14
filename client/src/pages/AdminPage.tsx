import { useEffect, useState } from 'react';
import { adminApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import type {
  AdminUsageSummaryRow,
  AdminUsageTotals,
  AdminUserUsage,
  AdminUserList,
  AdminUserListItem,
  AdminUserQuery,
  AdminFoundingMember,
  SubscriptionStatus,
  RoadmapRequest,
} from '../api/types';
import { roadmapApi } from '../api/endpoints';
import SafetyTab from '../components/admin/SafetyTab';
import GrowthTab from '../components/admin/GrowthTab';
import FeedbackTab from '../components/admin/FeedbackTab';
import UserPacks from '../components/admin/UserPacks';
import AssignmentBank from '../components/admin/AssignmentBank';

type Tab = 'growth' | 'usage' | 'problems' | 'users' | 'safety' | 'feedback' | 'roadmap';

function formatTokens(n: number): string {
  return n.toLocaleString();
}
function formatCost(n: number): string {
  return `$${n < 0.01 && n > 0 ? n.toFixed(4) : n.toFixed(2)}`;
}
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

export default function AdminPage() {
  // ?tab=safety / ?tab=feedback open those queues directly (the alert emails link there).
  const [tab, setTab] = useState<Tab>(() => {
    const requested = new URLSearchParams(window.location.search).get('tab');
    return requested === 'safety' || requested === 'feedback' ? requested : 'growth';
  });
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <h1>Admin Dashboard</h1>
      {error && <div className="error-banner">{error}</div>}

      <div className="tabs">
        <button className={`tab${tab === 'growth' ? ' active' : ''}`} onClick={() => setTab('growth')}>
          Growth
        </button>
        <button className={`tab${tab === 'usage' ? ' active' : ''}`} onClick={() => setTab('usage')}>
          Usage
        </button>
        <button className={`tab${tab === 'problems' ? ' active' : ''}`} onClick={() => setTab('problems')}>
          Problem Bank
        </button>
        <button className={`tab${tab === 'users' ? ' active' : ''}`} onClick={() => setTab('users')}>
          Users
        </button>
        <button className={`tab${tab === 'safety' ? ' active' : ''}`} onClick={() => setTab('safety')}>
          Safety
        </button>
        <button className={`tab${tab === 'feedback' ? ' active' : ''}`} onClick={() => setTab('feedback')}>
          Feedback
        </button>
        <button className={`tab${tab === 'roadmap' ? ' active' : ''}`} onClick={() => setTab('roadmap')}>
          Roadmap
        </button>
      </div>

      {tab === 'growth' && <GrowthTab onError={setError} />}
      {tab === 'usage' && <UsageTab onError={setError} />}
      {tab === 'problems' && <ProblemBankTab onError={setError} />}
      {tab === 'users' && <UsersTab onError={setError} />}
      {tab === 'safety' && <SafetyTab onError={setError} />}
      {tab === 'feedback' && <FeedbackTab onError={setError} />}
      {tab === 'roadmap' && <RoadmapTab onError={setError} />}
    </div>
  );
}

// ---- Usage tab ----
// Reads server/src/models/AiUsageLog.ts via GET /admin/usage/{summary,by-user}
// — see aiUsage.service.ts for what estimatedCostUsd actually means (a
// best-effort estimate, not a billing figure; the Anthropic Console is the
// real source of truth).
// "Today" is a calendar-day cutoff (since local midnight) — not expressible
// as a rolling `days` window, so it's its own kind rather than `days: 0` or
// similar. `all` is likewise its own kind so it can't be confused with "no
// selection yet" the way a bare `undefined` days value could be.
type UsageRange = { kind: 'today' } | { kind: 'days'; days: number } | { kind: 'all' };

const RANGE_OPTIONS: { label: string; range: UsageRange }[] = [
  { label: 'Today', range: { kind: 'today' } },
  { label: '7d', range: { kind: 'days', days: 7 } },
  { label: '30d', range: { kind: 'days', days: 30 } },
  { label: '90d', range: { kind: 'days', days: 90 } },
  { label: 'All time', range: { kind: 'all' } },
];

function sameRange(a: UsageRange, b: UsageRange): boolean {
  return a.kind === 'days' && b.kind === 'days' ? a.days === b.days : a.kind === b.kind;
}

// Translates a UsageRange into the {days?, since?} shape adminApi's usage
// endpoints expect — 'today' resolves to local midnight computed fresh at
// call time, not stored in state (so it's always "midnight of whichever day
// this request happens to fire on", not a stale snapshot).
function rangeToQuery(range: UsageRange): { days?: number; since?: string } {
  if (range.kind === 'days') return { days: range.days };
  if (range.kind === 'today') return { since: new Date(new Date().setHours(0, 0, 0, 0)).toISOString() };
  return {};
}

function UsageTab({ onError }: { onError: (msg: string | null) => void }) {
  const [range, setRange] = useState<UsageRange>({ kind: 'days', days: 7 });
  const [summary, setSummary] = useState<AdminUsageSummaryRow[] | null>(null);
  const [totals, setTotals] = useState<AdminUsageTotals | null>(null);
  const [byUser, setByUser] = useState<AdminUserUsage[] | null>(null);

  useEffect(() => {
    setSummary(null);
    setByUser(null);
    const query = rangeToQuery(range);
    adminApi
      .usageSummary(query)
      .then((res) => {
        setSummary(res.summary);
        setTotals(res.totals);
      })
      .catch((err) => onError(err instanceof ApiError ? err.message : 'Failed to load usage summary'));
    adminApi
      .usageByUser(query, 50)
      .then((res) => setByUser(res.users))
      .catch((err) => onError(err instanceof ApiError ? err.message : 'Failed to load per-user usage'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  return (
    <div className="flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-dim" style={{ fontSize: 13 }}>
          Range:
        </span>
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.label}
            className={`btn btn-sm${sameRange(range, opt.range) ? ' btn-primary' : ''}`}
            onClick={() => setRange(opt.range)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="card">
        <h3>By type &amp; purpose</h3>
        <p className="text-dim" style={{ fontSize: 13, marginTop: -8 }}>
          Estimated cost only. See the Anthropic Console for real billing.
        </p>
        {!summary ? (
          <span className="spinner" />
        ) : summary.length === 0 ? (
          <div className="empty-state">No AI calls logged in this range yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Purpose</th>
                  <th>Tier</th>
                  <th>Model</th>
                  <th>Calls</th>
                  <th>Input</th>
                  <th>Output</th>
                  <th>Cache write</th>
                  <th>Cache read</th>
                  <th>Est. cost</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((row) => (
                  <tr key={`${row.purpose}-${row.tier}-${row.modelId}`}>
                    <td>{row.purpose}</td>
                    <td>
                      <span className={`badge ${row.tier === 'reasoning' ? 'badge-accent' : 'badge-neutral'}`}>{row.tier}</span>
                    </td>
                    <td className="text-dim">{row.modelId}</td>
                    <td>{formatTokens(row.callCount)}</td>
                    <td>{formatTokens(row.inputTokens)}</td>
                    <td>{formatTokens(row.outputTokens)}</td>
                    <td>{formatTokens(row.cacheCreationInputTokens)}</td>
                    <td>{formatTokens(row.cacheReadInputTokens)}</td>
                    <td>{formatCost(row.estimatedCostUsd)}</td>
                  </tr>
                ))}
              </tbody>
              {totals && (
                <tfoot>
                  <tr>
                    <td colSpan={3}>Total</td>
                    <td>{formatTokens(totals.callCount)}</td>
                    <td>{formatTokens(totals.inputTokens)}</td>
                    <td>{formatTokens(totals.outputTokens)}</td>
                    <td>{formatTokens(totals.cacheCreationInputTokens)}</td>
                    <td>{formatTokens(totals.cacheReadInputTokens)}</td>
                    <td>{formatCost(totals.estimatedCostUsd)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h3>By user</h3>
        <p className="text-dim" style={{ fontSize: 13, marginTop: -8 }}>
          Sorted by estimated cost, highest first (the per-user baseline view).
        </p>
        {!byUser ? (
          <span className="spinner" />
        ) : byUser.length === 0 ? (
          <div className="empty-state">No AI calls logged in this range yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Calls</th>
                  <th>Input</th>
                  <th>Output</th>
                  <th>Cache write</th>
                  <th>Cache read</th>
                  <th>Est. cost</th>
                </tr>
              </thead>
              <tbody>
                {byUser.map((u) => (
                  <tr key={u.userId ?? 'unknown'}>
                    <td>
                      {u.name} <span className="text-faint">({u.email})</span>
                    </td>
                    <td>{formatTokens(u.callCount)}</td>
                    <td>{formatTokens(u.inputTokens)}</td>
                    <td>{formatTokens(u.outputTokens)}</td>
                    <td>{formatTokens(u.cacheCreationInputTokens)}</td>
                    <td>{formatTokens(u.cacheReadInputTokens)}</td>
                    <td>{formatCost(u.estimatedCostUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Problem Bank tab ----
// Problem Bank: the shared practice assignments learners get, plus the
// practice-library briefs nobody has started yet.
function ProblemBankTab({ onError }: { onError: (msg: string | null) => void }) {
  return <AssignmentBank onError={onError} />;
}

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  none: 'Not subscribed',
  trial: 'Trial',
  active: 'Active',
  past_due: 'Past due',
  canceled: 'Canceled',
  demo: 'Free access',
};

function UsersTab({ onError }: { onError: (msg: string | null) => void }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<SubscriptionStatus | ''>('');
  const [role, setRole] = useState<'user' | 'admin' | ''>('');
  const [packsFor, setPacksFor] = useState<{ id: string; email: string } | null>(null);
  const [sort, setSort] = useState<NonNullable<AdminUserQuery['sort']>>('newest');
  const [result, setResult] = useState<AdminUserList | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [busyUser, setBusyUser] = useState<string | null>(null);

  async function toggleFreeAccess(u: AdminUserListItem) {
    const grant = u.subscriptionStatus !== 'demo';
    const ask = grant
      ? `Give ${u.email} free access? They get full member access with no subscription.`
      : `Remove free access from ${u.email}? They'll need to subscribe to keep using Learn, Practice and Trak.`;
    if (!window.confirm(ask)) return;
    setBusyUser(u.id);
    onError(null);
    try {
      await adminApi.setFreeAccess(u.id, grant);
      setReloadKey((k) => k + 1);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Could not change free access');
    } finally {
      setBusyUser(null);
    }
  }

  // Search as you type, after a short pause.
  useEffect(() => {
    const t = window.setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setResult(null);
    adminApi
      .users({ page, q: q || undefined, status: status || undefined, role: role || undefined, sort })
      .then(setResult)
      .catch((err) => onError(err instanceof ApiError ? err.message : 'Failed to load users'));
  }, [page, q, status, role, sort, onError, reloadKey]);

  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.limit)) : 1;
  const byStatus = result?.counts.byStatus ?? {};

  return (
    <>
      <div className="card">
        <h3>Users</h3>
        {result && (
          <div className="flex gap-2" style={{ flexWrap: 'wrap', marginBottom: 12 }}>
            {(Object.keys(STATUS_LABELS) as SubscriptionStatus[]).map((s) => (
              <span key={s} className="badge badge-neutral">
                {STATUS_LABELS[s]}: {byStatus[s] ?? 0}
              </span>
            ))}
            <span className="badge badge-accent">Founding members: {result.counts.foundingMembers}</span>
          </div>
        )}
        <div className="flex gap-2" style={{ flexWrap: 'wrap', marginBottom: 12 }}>
          <input
            className="input"
            style={{ flex: '1 1 220px' }}
            placeholder="Search email or name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search users"
          />
          <select
            className="input"
            style={{ flex: '0 1 170px' }}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as SubscriptionStatus | '');
              setPage(1);
            }}
            aria-label="Subscription"
          >
            <option value="">Any subscription</option>
            {(Object.keys(STATUS_LABELS) as SubscriptionStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <select
            className="input"
            style={{ flex: '0 1 130px' }}
            value={role}
            onChange={(e) => {
              setRole(e.target.value as 'user' | 'admin' | '');
              setPage(1);
            }}
            aria-label="Role"
          >
            <option value="">Any role</option>
            <option value="user">Users</option>
            <option value="admin">Admins</option>
          </select>
          <select
            className="input"
            style={{ flex: '0 1 150px' }}
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as NonNullable<AdminUserQuery['sort']>);
              setPage(1);
            }}
            aria-label="Sort"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="email">Email A–Z</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>
        {!result ? (
          <span className="spinner" />
        ) : result.users.length === 0 ? (
          <p className="text-dim">No users match.</p>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Name</th>
                    <th>Subscription</th>
                    <th>Founding</th>
                    <th>Sign-in</th>
                    <th>Joined</th>
                    <th>Items passed</th>
                    <th>Submissions</th>
                    <th>Trak sessions</th>
                    <th>Packs</th>
                    <th>Free access</th>
                  </tr>
                </thead>
                <tbody>
                  {result.users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        {u.email}
                        {u.role === 'admin' && (
                          <span className="badge badge-accent" style={{ marginLeft: 6 }}>
                            admin
                          </span>
                        )}
                        {u.deletionScheduledFor && (
                          <div className="text-faint" style={{ fontSize: 12 }}>
                            Deleting {formatDate(u.deletionScheduledFor)}
                          </div>
                        )}
                      </td>
                      <td>{u.name}</td>
                      <td>{STATUS_LABELS[u.subscriptionStatus] ?? u.subscriptionStatus}</td>
                      <td>{u.foundingMember ? 'Yes' : ''}</td>
                      <td>{u.signInMethods.length ? u.signInMethods.join(', ') : 'Email'}</td>
                      <td>{formatDate(u.createdAt)}</td>
                      <td>{u.itemsPassedCount}</td>
                      <td>{u.submissionCount}</td>
                      <td>{u.tutorSessionCount}</td>
                      <td>
                        <button className="btn btn-sm" onClick={() => setPacksFor({ id: u.id, email: u.email })}>
                          Packs
                        </button>
                      </td>
                      <td>
                        {u.role !== 'admin' && ['none', 'canceled', 'demo'].includes(u.subscriptionStatus) && (
                          <button className="btn btn-sm" disabled={busyUser === u.id} onClick={() => toggleFreeAccess(u)}>
                            {u.subscriptionStatus === 'demo' ? 'Remove' : 'Give free access'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-2" style={{ marginTop: 12 }}>
              <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Prev
              </button>
              <span className="text-dim" style={{ fontSize: 13 }}>
                Page {page} of {totalPages} ({result.total} total)
              </span>
              <button className="btn btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          </>
        )}
      </div>
      {packsFor && (
        <UserPacks userId={packsFor.id} email={packsFor.email} onClose={() => setPacksFor(null)} onError={onError} />
      )}
      <FoundingMembersCard onError={onError} />
    </>
  );
}

// The founding-member list is kept per email, so it includes people who have
// since deleted their account. Downloadable as CSV.
function FoundingMembersCard({ onError }: { onError: (msg: string | null) => void }) {
  const [members, setMembers] = useState<AdminFoundingMember[] | null>(null);

  useEffect(() => {
    adminApi
      .foundingMembers()
      .then((r) => setMembers(r.members))
      .catch((err) => onError(err instanceof ApiError ? err.message : 'Failed to load founding members'));
  }, [onError]);

  function downloadCsv() {
    if (!members) return;
    const cell = (v: unknown) => {
      const text = v === null || v === undefined ? '' : String(v);
      const safe = /^[=+\-@]/.test(text) ? `'${text}` : text; // no spreadsheet formulas
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const header = ['email', 'founding_since', 'source_product', 'has_account', 'account_email', 'subscription_status', 'trial_used'];
    const rows = members.map((m) =>
      [m.email, m.foundingSince, m.sourceProduct, m.hasAccount, m.accountEmail, m.subscriptionStatus, m.trialUsed]
        .map(cell)
        .join(',')
    );
    const blob = new Blob([[header.join(','), ...rows].join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trakcode-founding-members-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="flex items-center justify-between gap-2" style={{ flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0 }}>Founding members {members && `(${members.length})`}</h3>
        <button className="btn btn-sm" onClick={downloadCsv} disabled={!members || members.length === 0}>
          Download CSV
        </button>
      </div>
      <p className="text-dim" style={{ fontSize: 13 }}>
        Kept by email address, so people stay on this list even after deleting their account.
      </p>
      {!members ? (
        <span className="spinner" />
      ) : members.length === 0 ? (
        <p className="text-dim">No founding members yet.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Founding since</th>
                <th>Account</th>
                <th>Subscription</th>
                <th>Trial used</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.email}>
                  <td>{m.email}</td>
                  <td>{formatDate(m.foundingSince)}</td>
                  <td>{m.hasAccount ? (m.accountEmail !== m.email ? m.accountEmail : 'Yes') : 'Deleted'}</td>
                  <td>{m.subscriptionStatus ? (STATUS_LABELS[m.subscriptionStatus] ?? m.subscriptionStatus) : ''}</td>
                  <td>{m.trialUsed ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---- Roadmap tab ----
function RoadmapTab({ onError }: { onError: (msg: string | null) => void }) {
  const [requests, setRequests] = useState<RoadmapRequest[] | null>(null);

  function load() {
    roadmapApi
      .list()
      .then((res) => setRequests(res.requests))
      .catch(() => {});
  }

  useEffect(load, []);

  async function handleStatusChange(id: string, status: RoadmapRequest['status']) {
    try {
      await adminApi.updateRoadmapStatus(id, status);
      load();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Failed to update status');
    }
  }

  return (
    <div className="flex-col gap-4">
      <div className="card">
        <h3>Roadmap status management</h3>
        {!requests ? (
          <span className="spinner" />
        ) : (
          <div className="flex-col gap-2">
            {requests.map((r) => (
              <div key={r.id} className="flex justify-between items-center" style={{ padding: '8px 0' }}>
                <div>
                  <strong>{r.title}</strong> <span className="text-faint">({r.votes} votes)</span>
                </div>
                <select
                  className="input"
                  style={{ width: 160 }}
                  value={r.status}
                  onChange={(e) => handleStatusChange(r.id, e.target.value as RoadmapRequest['status'])}
                >
                  <option value="requested">Requested</option>
                  <option value="planned">Planned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="live">Live</option>
                </select>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
