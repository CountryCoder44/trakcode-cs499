import { useEffect, useMemo, useState } from 'react';
import { practiceAssignmentsApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import { Link, useNavigate } from 'react-router-dom';
import type { PracticeAttemptSummary, PracticeLanguage, PracticeLibraryItem, PracticeLibraryStatus } from '../api/types';

// The practice library: ready-made assignment briefs to browse, filter, read
// and start (server: GET /practice/library, POST /practice/library/:id/start).
// The page owns starting, so a library start shows the same "preparing" and
// limit messages as the setup card above.

const SCOPE_LABEL: Record<string, string> = { small: 'Small', medium: 'Medium', large: 'Large' };
const STATUS_LABEL: Record<PracticeLibraryStatus, string> = {
  not_started: '',
  in_progress: 'In progress',
  completed: 'Completed',
  abandoned: 'Put down',
};

type TypeFilter = 'all' | 'basics' | 'stretch';
type DoneFilter = 'all' | 'completed' | 'not_completed' | 'started';

type Row = { kind: 'library'; item: PracticeLibraryItem } | { kind: 'own'; attempt: PracticeAttemptSummary };

const PAGE_SIZE = 20;

/**
 * Page numbers to show: every page when there are 7 or fewer, otherwise the
 * first, the last and the current page's neighbours, with gaps as null
 * (e.g. 1 … 4 5 6 … 15).
 */
export function pageList(current: number, count: number): (number | null)[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  // Keep 5 numbers in view at the ends so the list doesn't jump around.
  const start = Math.max(2, Math.min(current - 1, count - 4));
  const end = Math.min(count - 1, Math.max(current + 1, 5));
  const pages: (number | null)[] = [1];
  // A gap of exactly one page shows that page instead of "…".
  if (start === 3) pages.push(2);
  else if (start > 3) pages.push(null);
  for (let n = start; n <= end; n++) pages.push(n);
  if (end === count - 2) pages.push(count - 1);
  else if (end < count - 2) pages.push(null);
  pages.push(count);
  return pages;
}

export function Pager({ page, count, onPage }: { page: number; count: number; onPage: (n: number) => void }) {
  return (
    <nav className="library-pager" aria-label="Pages">
      <button className="btn btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </button>
      {pageList(page, count).map((n, i) =>
        n === null ? (
          <span key={`gap-${i}`} className="text-faint" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={n}
            className={`btn btn-sm${n === page ? ' btn-primary' : ''}`}
            aria-current={n === page ? 'page' : undefined}
            onClick={() => onPage(n)}
          >
            {n}
          </button>
        )
      )}
      <button className="btn btn-sm" disabled={page >= count} onClick={() => onPage(page + 1)}>
        Next
      </button>
    </nav>
  );
}

export default function PracticeLibrary({
  language,
  languageLabel,
  startingId,
  onStart,
  refreshKey,
}: {
  language: PracticeLanguage;
  languageLabel: string;
  /** The entry being started right now, if any (its button shows a spinner). */
  startingId: string | null;
  onStart: (item: PracticeLibraryItem) => void;
  /** Bump to reload (e.g. after a start finishes). */
  refreshKey: number;
}) {
  const navigate = useNavigate();
  const [items, setItems] = useState<PracticeLibraryItem[] | null>(null);
  // Unfinished assignments started from the setup card (shown under "Started, not completed").
  const [own, setOwn] = useState<PracticeAttemptSummary[]>([]);
  const [reopening, setReopening] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<TypeFilter>('all');
  const [concept, setConcept] = useState<string>('all');
  const [scope, setScope] = useState<string>('all');
  const [done, setDone] = useState<DoneFilter>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // New filters or a new language start back on page 1.
  useEffect(() => setPage(1), [type, concept, scope, done, language]);

  useEffect(() => {
    let alive = true;
    setItems(null);
    setError(null);
    practiceAssignmentsApi
      .library(language)
      .then((r) => {
        if (!alive) return;
        setItems(r.items);
        setOwn(r.ownUnfinished ?? []);
      })
      .catch((err) => alive && setError(err instanceof ApiError ? err.message : 'Could not load the practice library.'));
    return () => {
      alive = false;
    };
  }, [language, refreshKey]);

  const concepts = useMemo(() => {
    const seen = new Map<string, string>();
    for (const item of items ?? []) for (const c of item.concepts) seen.set(c.id, c.name);
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [items]);

  const shown = (items ?? []).filter(
    (i) =>
      (type === 'all' || i.mode === type) &&
      (concept === 'all' || i.concepts.some((c) => c.id === concept)) &&
      (scope === 'all' || i.scope === scope) &&
      (done === 'all' ||
        (done === 'completed'
          ? i.status === 'completed'
          : done === 'started'
            ? i.status === 'in_progress' || i.status === 'abandoned'
            : i.status !== 'completed'))
  );
  const ownShown =
    done === 'started'
      ? own.filter(
          (a) =>
            (type === 'all' || a.mode === type) &&
            (concept === 'all' || a.concepts.some((c) => c.id === concept)) &&
            (scope === 'all' || a.scope === scope)
        )
      : [];
  const rows: Row[] = [
    ...ownShown.map((attempt) => ({ kind: 'own' as const, attempt })),
    ...shown.map((item) => ({ kind: 'library' as const, item })),
  ];

  async function continueOwn(a: PracticeAttemptSummary) {
    setReopening(a.id);
    try {
      const { attempt } = await practiceAssignmentsApi.reopen(a.id);
      navigate(`/practice/attempt/${attempt.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not open that assignment.');
      setReopening(null);
    }
  }
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="card practice-library" style={{ marginTop: 20 }}>
      <div className="flex items-center justify-between gap-2" style={{ flexWrap: 'wrap', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Practice library</h3>
        {pageCount > 1 && <Pager page={currentPage} count={pageCount} onPage={setPage} />}
      </div>

      {items && items.length > 0 && (
        <div className="practice-library-filters">
          <select className="input input-sm" value={type} onChange={(e) => setType(e.target.value as TypeFilter)} aria-label="Type">
            <option value="all">Basics and stretch</option>
            <option value="basics">Practice the basics</option>
            <option value="stretch">Stretch out</option>
          </select>
          <select className="input input-sm" value={concept} onChange={(e) => setConcept(e.target.value)} aria-label="Concept">
            <option value="all">Any concept</option>
            {concepts.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          <select className="input input-sm" value={scope} onChange={(e) => setScope(e.target.value)} aria-label="Size">
            <option value="all">Any size</option>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
          <select className="input input-sm" value={done} onChange={(e) => setDone(e.target.value as DoneFilter)} aria-label="Completed">
            <option value="all">Completed or not</option>
            <option value="not_completed">Not completed</option>
            <option value="started">Started, not completed</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      )}

      {error && <div className="error-banner">{error}</div>}
      {!items && !error ? (
        <span className="spinner" />
      ) : items && items.length === 0 ? (
        <p className="text-dim" style={{ margin: 0 }}>
          The {languageLabel} practice library is on its way. Use the setup above to get an assignment in the meantime.
        </p>
      ) : rows.length === 0 ? (
        <p className="text-dim" style={{ margin: 0 }}>
          Nothing matches these filters.
        </p>
      ) : (
        <div className="practice-library-list">
          {pageRows.map((row) => {
            if (row.kind === 'own') {
              const a = row.attempt;
              return (
                <div key={`own-${a.id}`} className="library-row">
                  <div className="library-row-head" style={{ cursor: 'default' }}>
                    <span className="library-caret" aria-hidden="true" />
                    <div className="library-row-main">
                      <span className="library-title">{a.title}</span>
                      <span className="library-tags">
                        <span className={`library-tag ${a.mode}`}>{a.mode === 'basics' ? 'Basics' : 'Stretch'}</span>
                        {a.concepts.map((c) => (
                          <span key={c.id} className="library-tag concept">
                            {c.name}
                          </span>
                        ))}
                        <span className="text-faint" style={{ fontSize: 12 }}>
                          {SCOPE_LABEL[a.scope]}
                        </span>
                        <span className="badge badge-neutral">{a.status === 'abandoned' ? 'Put down' : 'In progress'}</span>
                        <span className="text-faint" style={{ fontSize: 12 }}>
                          Your own assignment
                        </span>
                      </span>
                    </div>
                    {a.status === 'abandoned' ? (
                      <button className="btn btn-sm btn-primary library-start" disabled={reopening !== null} onClick={() => continueOwn(a)}>
                        {reopening === a.id ? <span className="spinner" /> : 'Continue'}
                      </button>
                    ) : (
                      <Link to={`/practice/attempt/${a.id}`} className="btn btn-sm btn-primary library-start">
                        Resume
                      </Link>
                    )}
                  </div>
                </div>
              );
            }
            const item = row.item;
            const open = openId === item.id;
            return (
              <div key={item.id} className={`library-row${open ? ' open' : ''}`}>
                <div
                  className="library-row-head"
                  role="button"
                  tabIndex={0}
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? null : item.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setOpenId(open ? null : item.id);
                    }
                  }}
                >
                  <span className="library-caret" aria-hidden="true">
                    {open ? '▾' : '▸'}
                  </span>
                  <div className="library-row-main">
                    <span className="library-title">{item.title}</span>
                    <span className="library-tags">
                      <span className={`library-tag ${item.mode}`}>{item.mode === 'basics' ? 'Basics' : 'Stretch'}</span>
                      {item.concepts.map((c) => (
                        <span key={c.id} className="library-tag concept">
                          {c.name}
                        </span>
                      ))}
                      <span className="text-faint" style={{ fontSize: 12 }}>
                        {SCOPE_LABEL[item.scope]}
                      </span>
                      {item.status !== 'not_started' && (
                        <span className={`badge ${item.status === 'completed' ? 'badge-success' : 'badge-neutral'}`}>
                          {STATUS_LABEL[item.status]}
                        </span>
                      )}
                    </span>
                  </div>
                  <button
                    className="btn btn-sm btn-primary library-start"
                    disabled={startingId !== null}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStart(item);
                    }}
                  >
                    {startingId === item.id ? (
                      <span className="spinner" />
                    ) : item.status === 'in_progress' || item.status === 'abandoned' ? (
                      'Resume'
                    ) : item.status === 'completed' ? (
                      'Try again'
                    ) : (
                      'Start'
                    )}
                  </button>
                </div>
                {open && (
                  <div className="library-row-body">
                    <p style={{ marginTop: 0 }}>{item.scenario}</p>
                    <strong style={{ fontSize: 13 }}>What you'll build</strong>
                    <ul>
                      {item.requirements.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                    <p className="text-faint" style={{ fontSize: 12, marginBottom: 0 }}>
                      {item.ready
                        ? 'Ready to go. Starting it is instant and does not use a new practice question.'
                        : "You'll be the first to try this one: it's built for you when you start it (about a minute) and uses one of your new practice questions."}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {pageCount > 1 && (
        <div className="library-pager-bottom">
          <Pager page={currentPage} count={pageCount} onPage={setPage} />
          <span className="text-faint" style={{ fontSize: 12 }}>
            {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, rows.length)} of {rows.length}
          </span>
        </div>
      )}
    </div>
  );
}
