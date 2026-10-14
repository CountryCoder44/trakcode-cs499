import { useEffect, useState } from 'react';
import { adminApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import type {
  AdminPendingProblem,
  AdminUsageSummaryRow,
  AdminUsageTotals,
  AdminUserUsage,
  AdminProblemListItem,
  AdminUserListItem,
  RoadmapRequest,
} from '../api/types';
import { roadmapApi } from '../api/endpoints';

const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

type Tab = 'usage' | 'problems' | 'users' | 'roadmap';

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
  const [tab, setTab] = useState<Tab>('usage');
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <h1>Admin Dashboard</h1>
      {error && <div className="error-banner">{error}</div>}

      <div className="tabs">
        <button className={`tab${tab === 'usage' ? ' active' : ''}`} onClick={() => setTab('usage')}>
          Usage
        </button>
        <button className={`tab${tab === 'problems' ? ' active' : ''}`} onClick={() => setTab('problems')}>
          Problem Bank
        </button>
        <button className={`tab${tab === 'users' ? ' active' : ''}`} onClick={() => setTab('users')}>
          Users
        </button>
        <button className={`tab${tab === 'roadmap' ? ' active' : ''}`} onClick={() => setTab('roadmap')}>
          Roadmap &amp; Demo Codes
        </button>
      </div>

      {tab === 'usage' && <UsageTab onError={setError} />}
      {tab === 'problems' && <ProblemBankTab onError={setError} />}
      {tab === 'users' && <UsersTab onError={setError} />}
      {tab === 'roadmap' && <RoadmapAndDemoCodesTab onError={setError} />}
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
          Estimated cost only — see the Anthropic Console for real billing.
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
          Sorted by estimated cost, highest first — the per-user baseline view.
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
function ProblemBankTab({ onError }: { onError: (msg: string | null) => void }) {
  const [pending, setPending] = useState<AdminPendingProblem[] | null>(null);
  const [stack, setStack] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [type, setType] = useState('');
  const [topic, setTopic] = useState('');
  const [validated, setValidated] = useState('');
  const [sort, setSort] = useState('timesServed');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{ problems: AdminProblemListItem[]; total: number; limit: number } | null>(null);

  useEffect(() => {
    adminApi
      .pendingReview()
      .then((res) => setPending(res.problems))
      .catch((err) => onError(err instanceof ApiError ? err.message : 'Failed to load pending review'));
  }, [onError]);

  useEffect(() => {
    setResult(null);
    adminApi
      .problems({ stack, difficulty, type, topic, validated, sort, page })
      .then(setResult)
      .catch((err) => onError(err instanceof ApiError ? err.message : 'Failed to load problem bank'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stack, difficulty, type, topic, validated, sort, page]);

  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.limit)) : 1;

  return (
    <div className="flex-col gap-4">
      <div className="card">
        <h3>Pending problem review</h3>
        <p className="text-dim" style={{ fontSize: 13 }}>
          Generations that exhausted retries (§5) — never served to users.
        </p>
        {!pending ? (
          <span className="spinner" />
        ) : pending.length === 0 ? (
          <div className="empty-state">Nothing pending review.</div>
        ) : (
          <div className="flex-col gap-2">
            {pending.map((p) => (
              <div key={p.id} className="card">
                <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
                  <span className="badge badge-neutral">{p.stack}</span>
                  <span className="badge badge-neutral">{p.difficulty}</span>
                  <span className="badge badge-danger">{p.type}</span>
                </div>
                <p style={{ margin: 0, fontSize: 13, fontFamily: 'var(--font-mono)' }}>{p.prompt}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3>Full bank</h3>
        <p className="text-dim" style={{ fontSize: 13, marginTop: -8 }}>
          <code>timesServed</code> is bank-reuse across users — the scalability mechanism (a validated problem is served
          to any user who hasn't seen it, not just the one who triggered generation).
        </p>
        <div className="grid grid-2" style={{ marginBottom: 16 }}>
          <div className="field">
            <label htmlFor="fStack">Stack</label>
            <select
              id="fStack"
              className="input"
              value={stack}
              onChange={(e) => {
                setPage(1);
                setStack(e.target.value);
              }}
            >
              <option value="">All</option>
              <option value="python">python</option>
              <option value="mern">mern</option>
              <option value="cpp">cpp</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="fDifficulty">Difficulty</label>
            <select
              id="fDifficulty"
              className="input"
              value={difficulty}
              onChange={(e) => {
                setPage(1);
                setDifficulty(e.target.value);
              }}
            >
              <option value="">All</option>
              <option value="easy">easy</option>
              <option value="medium">medium</option>
              <option value="hard">hard</option>
              <option value="interview">interview</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="fType">Type</label>
            <select
              id="fType"
              className="input"
              value={type}
              onChange={(e) => {
                setPage(1);
                setType(e.target.value);
              }}
            >
              <option value="">All</option>
              <option value="deep_dive">deep_dive</option>
              <option value="flash_bug">flash_bug</option>
              <option value="flash_fill">flash_fill</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="fTopic">Topic contains</label>
            <input
              id="fTopic"
              className="input"
              value={topic}
              onChange={(e) => {
                setPage(1);
                setTopic(e.target.value);
              }}
            />
          </div>
          <div className="field">
            <label htmlFor="fValidated">Validated</label>
            <select
              id="fValidated"
              className="input"
              value={validated}
              onChange={(e) => {
                setPage(1);
                setValidated(e.target.value);
              }}
            >
              <option value="">All</option>
              <option value="true">Validated</option>
              <option value="false">Not validated</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="fSort">Sort by</label>
            <select id="fSort" className="input" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="timesServed">Times served</option>
              <option value="createdAt">Newest</option>
            </select>
          </div>
        </div>

        {!result ? (
          <span className="spinner" />
        ) : result.problems.length === 0 ? (
          <div className="empty-state">No problems match these filters.</div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Topic</th>
                    <th>Stack</th>
                    <th>Difficulty</th>
                    <th>Type</th>
                    <th>Validated</th>
                    <th>Times served</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {result.problems.map((p) => (
                    <tr key={p.id}>
                      <td>{p.topic}</td>
                      <td>{p.stack}</td>
                      <td>{p.difficulty}</td>
                      <td>{p.type}</td>
                      <td>
                        <span className={`badge ${p.validated ? 'badge-success' : 'badge-warning'}`}>
                          {p.validated ? 'yes' : 'no'}
                        </span>
                      </td>
                      <td>{p.timesServed}</td>
                      <td>{formatDate(p.createdAt)}</td>
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
    </div>
  );
}

// ---- Users tab ----
function UsersTab({ onError }: { onError: (msg: string | null) => void }) {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{ users: AdminUserListItem[]; total: number; limit: number } | null>(null);

  useEffect(() => {
    setResult(null);
    adminApi
      .users(page)
      .then(setResult)
      .catch((err) => onError(err instanceof ApiError ? err.message : 'Failed to load users'));
  }, [page, onError]);

  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.limit)) : 1;

  return (
    <div className="card">
      <h3>Users</h3>
      {!result ? (
        <span className="spinner" />
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Subscription</th>
                  <th>Joined</th>
                  <th>Submissions</th>
                  <th>Tutor sessions</th>
                  <th>Lessons completed</th>
                </tr>
              </thead>
              <tbody>
                {result.users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td>{u.name}</td>
                    <td>
                      <span className={`badge ${u.role === 'admin' ? 'badge-accent' : 'badge-neutral'}`}>{u.role}</span>
                    </td>
                    <td>{u.subscriptionStatus}</td>
                    <td>{formatDate(u.createdAt)}</td>
                    <td>{u.submissionCount}</td>
                    <td>{u.tutorSessionCount}</td>
                    <td>{u.completedLessonCount}</td>
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
  );
}

// ---- Roadmap & Demo Codes tab ----
// Unchanged from the pre-dashboard AdminPage — just relocated into its own tab.
function RoadmapAndDemoCodesTab({ onError }: { onError: (msg: string | null) => void }) {
  const [requests, setRequests] = useState<RoadmapRequest[] | null>(null);

  // Demo code creation is gated by DEMO_CODE_ADMIN_KEY (a shared machine
  // credential per spec §7), not the logged-in admin's JWT — see
  // server/src/middleware/adminAuth.middleware.ts. Kept in local state only.
  const [adminKey, setAdminKey] = useState('');
  const [demoCode, setDemoCode] = useState('');
  const [issuedTo, setIssuedTo] = useState('');
  const [maxUses, setMaxUses] = useState(10);
  const [demoCodeResult, setDemoCodeResult] = useState<string | null>(null);

  function load() {
    roadmapApi
      .list()
      .then((res) => setRequests(res.requests))
      .catch(() => {});
  }

  useEffect(load, []);

  async function handleCreateDemoCode(e: React.FormEvent) {
    e.preventDefault();
    setDemoCodeResult(null);
    onError(null);
    try {
      const res = await fetch(`${API_BASE}/admin/demo-codes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ code: demoCode, issuedTo, maxUses }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Failed to create demo code');
      setDemoCodeResult(`Created "${body.demoCode.code}" — ${body.demoCode.usesRemaining} uses remaining.`);
      setDemoCode('');
      setIssuedTo('');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to create demo code');
    }
  }

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
        <h3>Create demo code</h3>
        <form onSubmit={handleCreateDemoCode}>
          <div className="grid grid-2">
            <div className="field">
              <label htmlFor="adminKey">Admin key</label>
              <input
                id="adminKey"
                type="password"
                className="input"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="demoCode">Code</label>
              <input
                id="demoCode"
                className="input"
                placeholder="CS4900-PROF"
                value={demoCode}
                onChange={(e) => setDemoCode(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="issuedTo">Issued to</label>
              <input
                id="issuedTo"
                className="input"
                placeholder="Prof. Smith"
                value={issuedTo}
                onChange={(e) => setIssuedTo(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="maxUses">Max uses</label>
              <input
                id="maxUses"
                type="number"
                min={1}
                className="input"
                value={maxUses}
                onChange={(e) => setMaxUses(Number(e.target.value))}
                required
              />
            </div>
          </div>
          <button className="btn btn-primary" type="submit">
            Create demo code
          </button>
          {demoCodeResult && (
            <div className="badge badge-success" style={{ display: 'block', marginTop: 12 }}>
              {demoCodeResult}
            </div>
          )}
        </form>
      </div>

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
