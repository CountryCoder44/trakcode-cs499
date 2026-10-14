import { useEffect, useState } from 'react';
import { adminApi } from '../../api/endpoints';
import { ApiError } from '../../api/client';
import type { AdminAssignmentList, AdminAssignmentQuery, PracticeLanguage } from '../../api/types';
import { Pager } from '../PracticeLibrary';

// Admin, Problem Bank: every shared practice assignment, laid out like the
// learners' practice library (one line per assignment, click to read it),
// with filters by language and more (GET /admin/practice/assignments).

const LANGUAGE_LABEL: Record<PracticeLanguage, string> = {
  python: 'Python',
  java: 'Java',
  cpp: 'C++',
  typescript: 'TypeScript',
};
const SCOPE_LABEL: Record<string, string> = { small: 'Small', medium: 'Medium', large: 'Large' };
const SORTS: { id: NonNullable<AdminAssignmentQuery['sort']>; label: string }[] = [
  { id: 'newest', label: 'Newest first' },
  { id: 'oldest', label: 'Oldest first' },
  { id: 'language', label: 'Language' },
  { id: 'title', label: 'Title A-Z' },
  { id: 'mostAssigned', label: 'Most assigned' },
  { id: 'leastAssigned', label: 'Least assigned' },
];

export default function AssignmentBank({ onError }: { onError: (msg: string | null) => void }) {
  const [query, setQuery] = useState<AdminAssignmentQuery>({ sort: 'newest', page: 1 });
  const [search, setSearch] = useState('');
  const [result, setResult] = useState<AdminAssignmentList | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  // Search titles as you type, after a short pause.
  useEffect(() => {
    const t = window.setTimeout(() => setQuery((q) => ({ ...q, q: search.trim() || undefined, page: 1 })), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setResult(null);
    adminApi
      .practiceAssignments(query)
      .then(setResult)
      .catch((err) => onError(err instanceof ApiError ? err.message : 'Failed to load the assignment bank'));
  }, [query, onError]);

  const set = (patch: Partial<AdminAssignmentQuery>) => {
    setOpenId(null);
    setQuery((q) => ({ ...q, ...patch, page: patch.page ?? 1 }));
  };
  const pageCount = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;
  const page = query.page ?? 1;

  return (
    <div className="card practice-library">
      <div className="flex items-center justify-between gap-2" style={{ flexWrap: 'wrap', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Practice assignments</h3>
        {pageCount > 1 && <Pager page={page} count={pageCount} onPage={(n) => set({ page: n })} />}
      </div>

      {result && (
        <div className="flex gap-2" style={{ flexWrap: 'wrap', marginBottom: 10 }}>
          {(Object.keys(LANGUAGE_LABEL) as PracticeLanguage[]).map((l) => (
            <button
              key={l}
              className={`badge ${query.language === l ? 'badge-accent' : 'badge-neutral'} bank-lang`}
              onClick={() => set({ language: query.language === l ? undefined : l })}
            >
              {LANGUAGE_LABEL[l]}: {result.byLanguage[l] ?? 0}
            </button>
          ))}
        </div>
      )}

      <div className="practice-library-filters">
        <input
          className="input input-sm"
          placeholder="Search titles"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search titles"
        />
        <select
          className="input input-sm"
          value={query.language ?? ''}
          onChange={(e) => set({ language: (e.target.value || undefined) as PracticeLanguage | undefined })}
          aria-label="Language"
        >
          <option value="">Any language</option>
          {(Object.keys(LANGUAGE_LABEL) as PracticeLanguage[]).map((l) => (
            <option key={l} value={l}>
              {LANGUAGE_LABEL[l]}
            </option>
          ))}
        </select>
        <select
          className="input input-sm"
          value={query.mode ?? ''}
          onChange={(e) => set({ mode: (e.target.value || undefined) as AdminAssignmentQuery['mode'] })}
          aria-label="Type"
        >
          <option value="">Basics and stretch</option>
          <option value="basics">Practice the basics</option>
          <option value="stretch">Stretch out</option>
        </select>
        <select
          className="input input-sm"
          value={query.scope ?? ''}
          onChange={(e) => set({ scope: (e.target.value || undefined) as AdminAssignmentQuery['scope'] })}
          aria-label="Size"
        >
          <option value="">Any size</option>
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
        <select
          className="input input-sm"
          value={query.status ?? ''}
          onChange={(e) => set({ status: (e.target.value || undefined) as AdminAssignmentQuery['status'] })}
          aria-label="Status"
        >
          <option value="">Any status</option>
          <option value="published">Published</option>
          <option value="quarantined">Quarantined</option>
          <option value="disabled">Disabled</option>
          <option value="unbuilt">Not built yet</option>
        </select>
        <select
          className="input input-sm"
          value={query.source ?? ''}
          onChange={(e) => set({ source: (e.target.value || undefined) as AdminAssignmentQuery['source'] })}
          aria-label="Source"
        >
          <option value="">Any source</option>
          <option value="library">From the practice library</option>
          <option value="generated">Generated</option>
          <option value="legacy">Old Deep Dive problems</option>
        </select>
        <select
          className="input input-sm"
          value={query.sort}
          onChange={(e) => set({ sort: e.target.value as AdminAssignmentQuery['sort'] })}
          aria-label="Sort"
        >
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>
              Sort: {s.label}
            </option>
          ))}
        </select>
      </div>

      {!result ? (
        <span className="spinner" />
      ) : result.items.length === 0 ? (
        <p className="text-dim" style={{ margin: 0 }}>
          {result.total === 0 && !query.language && !query.q
            ? 'No assignments yet. They appear here as learners generate them or start practice library entries.'
            : 'Nothing matches these filters.'}
        </p>
      ) : (
        <div className="practice-library-list">
          {result.items.map((a) => {
            const open = openId === a.id;
            return (
              <div key={a.id} className={`library-row${open ? ' open' : ''}`}>
                <div
                  className="library-row-head"
                  role="button"
                  tabIndex={0}
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? null : a.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setOpenId(open ? null : a.id);
                    }
                  }}
                >
                  <span className="library-caret" aria-hidden="true">
                    {open ? '▾' : '▸'}
                  </span>
                  <div className="library-row-main">
                    <span className="library-title">{a.title}</span>
                    <span className="library-tags">
                      <span className="library-tag lang">{LANGUAGE_LABEL[a.language]}</span>
                      <span className={`library-tag ${a.mode}`}>{a.mode === 'basics' ? 'Basics' : 'Stretch'}</span>
                      {a.concepts.map((c) => (
                        <span key={c.id} className="library-tag concept">
                          {c.name}
                        </span>
                      ))}
                      <span className="text-faint" style={{ fontSize: 12 }}>
                        {SCOPE_LABEL[a.scope]}
                      </span>
                      {a.status === 'unbuilt' ? (
                        <span className="badge badge-neutral">Not built yet</span>
                      ) : (
                        a.status !== 'published' && <span className="badge badge-warning">{a.status}</span>
                      )}
                      {a.libraryId && <span className="badge badge-neutral">{a.libraryId}</span>}
                    </span>
                  </div>
                  <span className="text-faint bank-assigned" title="Times given to a learner">
                    {a.built ? `${a.timesAssigned}× assigned` : 'Library brief'}
                  </span>
                </div>
                {open && (
                  <div className="library-row-body">
                    <p style={{ marginTop: 0 }}>{a.scenario}</p>
                    {a.goal && (
                      <p>
                        <strong style={{ fontSize: 13 }}>Goal:</strong> {a.goal}
                      </p>
                    )}
                    <strong style={{ fontSize: 13 }}>Requirements</strong>
                    <ul>
                      {a.requirements.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                    <p className="text-faint" style={{ fontSize: 12, marginBottom: 0 }}>
                      {a.built
                        ? `${a.tests.visible} visible and ${a.tests.hidden} hidden tests · learners: ${a.attempts.completed} completed, ${a.attempts.inProgress} in progress, ${a.attempts.abandoned} put down · added ${a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ''} · ${a.source === 'legacy' ? 'copied from an old Deep Dive problem' : a.libraryId ? 'built from the practice library' : 'generated'}`
                        : "Practice-library brief. It's generated (with tests and a reference solution) the first time a learner starts it."}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {result && pageCount > 1 && (
        <div className="library-pager-bottom">
          <Pager page={page} count={pageCount} onPage={(n) => set({ page: n })} />
          <span className="text-faint" style={{ fontSize: 12 }}>
            {(page - 1) * result.pageSize + 1}–{Math.min(page * result.pageSize, result.total)} of {result.total}
          </span>
        </div>
      )}
    </div>
  );
}
