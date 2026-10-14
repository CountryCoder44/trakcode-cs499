import { useEffect, useState } from 'react';
import { adminApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import type {
  AdminPendingProblem,
  AdminProblemListItem,
  AdminUserListItem,
  RoadmapRequest,
} from '../api/types';
import { roadmapApi } from '../api/endpoints';

const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

type Tab = 'problems' | 'users' | 'roadmap';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('problems');
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <h1>Admin Dashboard</h1>
      {error && <div className="error-banner">{error}</div>}

      <div className="tabs">
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

      {tab === 'problems' && <ProblemBankTab onError={setError} />}
      {tab === 'users' && <UsersTab onError={setError} />}
      {tab === 'roadmap' && <RoadmapAndDemoCodesTab onError={setError} />}
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
              <option value="typescript">typescript</option>
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
                    <th title="Highest Sequential Curriculum topic this problem is scoped to — blank means unscoped, never served to a topic-scoped request">
                      Topic scope
                    </th>
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
                      <td>{p.requiredTopicNumber != null ? `≤ Topic ${p.requiredTopicNumber}` : <span className="text-faint">unscoped</span>}</td>
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
