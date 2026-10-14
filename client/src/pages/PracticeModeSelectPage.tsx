import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { practiceAssignmentsApi } from '../api/endpoints';
import type {
  PracticeAttemptSummary,
  PracticeCatalog,
  PracticeConflict,
  PracticeLibraryItem,
  PracticeLanguage,
  PracticeMode,
  PracticeScope,
  PracticeStartRequest,
  PracticeStartResult,
} from '../api/types';
import { ApiError } from '../api/client';
import PracticeLibrary from '../components/PracticeLibrary';
import { PracticeAllowanceLine, PracticeLimitNotice, useUsage } from '../components/TrakAllowance';

const DEFAULT_LANGUAGES: { id: PracticeLanguage; label: string }[] = [
  { id: 'python', label: 'Python' },
  { id: 'java', label: 'Java' },
  { id: 'cpp', label: 'C++' },
];

// Practice Mode: two long-form modes. Language → mode → scope → (stretch
// settings) → Start. The server always looks in the shared assignment bank
// first and only prepares a new assignment when nothing there fits; this page
// just shows the outcome. A failed or conflicting request keeps every setting
// as the learner left it.

const SCOPE_ORDER: PracticeScope[] = ['small', 'medium', 'large'];

type Phase =
  | { kind: 'idle' }
  | { kind: 'finding' }
  | { kind: 'preparing'; jobId: string }
  | { kind: 'failed'; message: string }
  | { kind: 'conflict'; conflict: PracticeConflict }
  | { kind: 'previously_started'; title: string; attemptId: string }
  | { kind: 'active_exists'; attempt: PracticeAttemptSummary };

const MODE_COPY: Record<PracticeMode, { title: string; body: string }> = {
  basics: {
    title: 'Practice the basics',
    body: 'A substantial assignment built only from skills you already have. Plan it and build it from a clear spec.',
  },
  stretch: {
    title: 'Stretch out',
    body: 'A substantial assignment that needs 1 to 3 concepts beyond the basics, with Trak helping more with the new parts.',
  },
};

const PENDING_JOB_KEY = 'trakcode_practice_pending_job';

function readPendingJob(): string | null {
  try {
    return localStorage.getItem(PENDING_JOB_KEY);
  } catch {
    return null;
  }
}

function writePendingJob(jobId: string | null): void {
  try {
    if (jobId) localStorage.setItem(PENDING_JOB_KEY, jobId);
    else localStorage.removeItem(PENDING_JOB_KEY);
  } catch {
    // Storage unavailable: the learner can simply start again.
  }
}

function newRequestId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function StepSlider<T extends string | number>({
  id,
  values,
  value,
  onChange,
  labels,
}: {
  id: string;
  values: T[];
  value: T;
  onChange: (v: T) => void;
  labels: (v: T) => string;
}) {
  const index = Math.max(0, values.indexOf(value));
  return (
    <div className="step-slider">
      <input
        id={id}
        type="range"
        min={0}
        max={values.length - 1}
        step={1}
        value={index}
        onChange={(e) => onChange(values[Number(e.target.value)])}
        aria-valuetext={labels(value)}
      />
      <div className="step-slider-labels">
        {values.map((v) => (
          <button key={String(v)} type="button" className={v === value ? 'active' : ''} onClick={() => onChange(v)}>
            {labels(v)}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PracticeModeSelectPage() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState<PracticeLanguage>('python');
  const [mode, setMode] = useState<PracticeMode>('basics');
  const [scope, setScope] = useState<PracticeScope>('small');
  const [conceptCount, setConceptCount] = useState(1);
  const [conceptIds, setConceptIds] = useState<string[]>([]);
  const [foundationIds, setFoundationIds] = useState<string[]>([]);

  const [catalog, setCatalog] = useState<PracticeCatalog | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  // Where the current start came from, so its status shows next to it.
  const [startSource, setStartSource] = useState<'setup' | 'library'>('setup');
  const [libraryStartId, setLibraryStartId] = useState<string | null>(null);
  const [libraryRefresh, setLibraryRefresh] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [limitError, setLimitError] = useState<unknown>(null);
  const { usage, refresh: refreshUsage } = useUsage();
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    setCatalog(null);
    setCatalogError(null);
    practiceAssignmentsApi
      .catalog(language)
      .then((c) => {
        if (!alive) return;
        setCatalog(c);
        setFoundationIds(c.foundation.filter((f) => f.checked).map((f) => f.id));
        setConceptIds([]);
      })
      .catch((err) => alive && setCatalogError(err instanceof ApiError ? err.message : 'Could not load practice options.'));
    return () => {
      alive = false;
    };
  }, [language]);

  useEffect(() => () => {
    if (pollRef.current) window.clearTimeout(pollRef.current);
  }, []);

  // A pending assignment keeps preparing on the server if the learner leaves;
  // remember it so coming back picks it up. Losing this is harmless: starting
  // again with the same settings joins the same job.
  useEffect(() => {
    const jobId = readPendingJob();
    if (jobId) {
      setPhase({ kind: 'preparing', jobId });
      void poll(jobId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResult = useCallback(
    (res: PracticeStartResult) => {
      if (res.status !== 'pending') writePendingJob(null);
      switch (res.status) {
        case 'ready':
          navigate(`/practice/attempt/${res.attempt.id}`);
          return;
        case 'pending':
          writePendingJob(res.jobId);
          setPhase({ kind: 'preparing', jobId: res.jobId });
          pollRef.current = window.setTimeout(() => poll(res.jobId), 2500);
          return;
        case 'conflict':
          setPhase({ kind: 'conflict', conflict: res.conflict });
          return;
        case 'previously_started':
          setPhase({ kind: 'previously_started', title: res.assignment.title, attemptId: res.abandonedAttemptId });
          return;
        case 'active_exists':
          setPhase({ kind: 'active_exists', attempt: res.attempt });
          return;
        case 'failed':
        case 'unavailable':
          setPhase({ kind: 'failed', message: res.message });
          return;
      }
    },
    // poll is stable enough for this page's lifetime
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate]
  );

  async function poll(jobId: string) {
    try {
      handleResult(await practiceAssignmentsApi.job(jobId));
    } catch (err) {
      writePendingJob(null);
      setPhase({ kind: 'failed', message: err instanceof ApiError ? err.message : 'Lost track of that assignment. Try again.' });
    }
  }

  async function startLibrary(item: PracticeLibraryItem) {
    setError(null);
    setLimitError(null);
    setStartSource('library');
    setLibraryStartId(item.id);
    setPhase({ kind: 'finding' });
    try {
      handleResult(await practiceAssignmentsApi.startLibrary(item.id, newRequestId()));
    } catch (err) {
      setPhase({ kind: 'idle' });
      if (err instanceof ApiError && err.details?.code === 'PRACTICE_LIMIT') setLimitError(err);
      else setError(err instanceof ApiError ? err.message : 'Could not start that assignment.');
    } finally {
      refreshUsage();
      setLibraryRefresh((n) => n + 1);
    }
  }

  async function start(intent: 'auto' | 'new' = 'auto', overrides: Partial<PracticeStartRequest> = {}) {
    setStartSource('setup');
    setError(null);
    setPhase({ kind: 'finding' });
    const body: PracticeStartRequest = {
      requestId: newRequestId(),
      intent,
      language,
      mode,
      scope,
      foundationIds,
      ...(mode === 'stretch'
        ? { conceptCount, conceptIds }
        : {}),
      ...overrides,
    };
    setLimitError(null);
    try {
      handleResult(await practiceAssignmentsApi.start(body));
    } catch (err) {
      setPhase({ kind: 'idle' });
      if (err instanceof ApiError && err.details?.code === 'PRACTICE_LIMIT') setLimitError(err);
      else setError(err instanceof ApiError ? err.message : 'Could not start practice.');
    } finally {
      refreshUsage();
    }
  }

  function applySuggestion(patch: PracticeConflict['suggestions'][number]['patch']) {
    if (patch.scope) setScope(patch.scope);
    if (patch.conceptCount !== undefined) setConceptCount(patch.conceptCount);
    if (patch.conceptIds) {
      setConceptIds(patch.conceptIds);
    }
    if (patch.foundationIds) setFoundationIds(patch.foundationIds);
    // The learner picked this change explicitly, so go ahead with it.
    void start('auto', patch);
  }

  async function reopen(attemptId: string, fresh: boolean) {
    try {
      const { attempt } = fresh ? await practiceAssignmentsApi.restart(attemptId) : await practiceAssignmentsApi.reopen(attemptId);
      navigate(`/practice/attempt/${attempt.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not open that assignment.');
    }
  }

  function toggle(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  const busy = phase.kind === 'finding' || phase.kind === 'preparing';
  const scopeInfo = catalog?.scopes.find((s) => s.id === scope);

  return (
    <div className="practice-setup">
      <h1>Practice</h1>

      <div className="card">
        {startSource === 'setup' && (
          <>
            {error && <div className="error-banner">{error}</div>}
            <PracticeLimitNotice error={limitError} />
          </>
        )}

        <div className="field">
          <label htmlFor="language">Language</label>
          <select id="language" className="input" value={language} onChange={(e) => setLanguage(e.target.value as PracticeLanguage)} disabled={busy}>
            {(catalog?.languages ?? DEFAULT_LANGUAGES).map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-2" style={{ marginBottom: 16 }}>
          {(['basics', 'stretch'] as PracticeMode[]).map((m) => (
            <button
              key={m}
              type="button"
              className={`card practice-mode-card${mode === m ? ' selected' : ''}`}
              onClick={() => setMode(m)}
              disabled={busy}
            >
              <h3 style={{ margin: 0 }}>{MODE_COPY[m].title}</h3>
              <p style={{ margin: '4px 0 0' }}>{MODE_COPY[m].body}</p>
            </button>
          ))}
        </div>

        <div className="field">
          <label htmlFor="scope">Scope</label>
          <StepSlider id="scope" values={SCOPE_ORDER} value={scope} onChange={setScope} labels={(s) => catalog?.scopes.find((x) => x.id === s)?.label ?? s} />
          {scopeInfo && <p className="text-faint practice-hint">{scopeInfo.description}</p>}
        </div>

        {mode === 'stretch' && catalog && (
          <>
            <div className="field">
              <label htmlFor="conceptCount">Advanced Concepts</label>
              <StepSlider
                id="conceptCount"
                values={Array.from({ length: catalog.maxConcepts }, (_, i) => i + 1)}
                value={conceptCount}
                onChange={(n) => {
                  setConceptCount(n);
                  // Never more picked concepts than the slider allows.
                  setConceptIds((prev) => prev.slice(0, n));
                }}
                labels={(n) => String(n)}
              />
              <p className="text-faint practice-hint">
                How many concepts beyond the basics the assignment must bring together. This is separate from scope: a small
                assignment can still introduce a demanding concept.
              </p>
            </div>

            <div className="field">
              <label>Specific concepts (optional)</label>
              <div className="chip-list">
                {catalog.concepts.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    title={c.description}
                    className={`chip${conceptIds.includes(c.id) ? ' selected' : ''}`}
                    // Once the slider's number is picked, the rest are locked until one is unpicked.
                    disabled={!conceptIds.includes(c.id) && conceptIds.length >= conceptCount}
                    onClick={() => setConceptIds((prev) => toggle(prev, c.id))}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
              <p className="text-faint practice-hint">
                Pick up to {conceptCount}. Picked concepts are always included; any open slots are filled with concepts that
                fit with them.
              </p>
            </div>
          </>
        )}

        {catalogError && <div className="error-banner">{catalogError}</div>}

        <button className="btn btn-primary btn-block" style={{ marginTop: 16 }} onClick={() => start('auto')} disabled={busy || !catalog}>
          {busy ? <span className="spinner" /> : 'Start practice'}
        </button>
        <PracticeAllowanceLine usage={usage} />

        {startSource === 'setup' && (
          <PhasePanel phase={phase} onRetry={() => start('auto')} onSuggestion={applySuggestion} onNew={() => start('new')} onReopen={reopen} />
        )}
      </div>

      {/* Ready-made assignments to browse and start. Flash cards are a post-launch addition. */}
      <PracticeLibrary
        language={language}
        languageLabel={(catalog?.languages ?? DEFAULT_LANGUAGES).find((l) => l.id === language)?.label ?? language}
        startingId={startSource === 'library' && busy ? libraryStartId : null}
        onStart={startLibrary}
        refreshKey={libraryRefresh}
      />
      {startSource === 'library' && (
        <div className="practice-library-status">
          {error && <div className="error-banner">{error}</div>}
          <PracticeLimitNotice error={limitError} />
          <PhasePanel phase={phase} onRetry={() => setPhase({ kind: 'idle' })} onSuggestion={applySuggestion} onNew={() => start('new')} onReopen={reopen} />
        </div>
      )}
    </div>
  );
}

function PhasePanel({
  phase,
  onRetry,
  onSuggestion,
  onNew,
  onReopen,
}: {
  phase: Phase;
  onRetry: () => void;
  onSuggestion: (patch: PracticeConflict['suggestions'][number]['patch']) => void;
  onNew: () => void;
  onReopen: (attemptId: string, fresh: boolean) => void;
}) {
  switch (phase.kind) {
    case 'idle':
      return null;
    case 'finding':
      return <div className="practice-status">Finding an assignment…</div>;
    case 'preparing':
      return (
        <div className="practice-status">
          <span className="spinner" /> Preparing a new assignment. Nothing in the bank fit yet, so this one is being written and checked; it can take a few minutes. You can leave this page and come back.
        </div>
      );
    case 'failed':
      return (
        <div className="practice-status practice-status-error">
          <strong>Unable to prepare this assignment.</strong> {phase.message}
          <div style={{ marginTop: 8 }}>
            <button className="btn btn-sm" onClick={onRetry}>
              Try again
            </button>
          </div>
        </div>
      );
    case 'conflict':
      return (
        <div className="practice-status practice-status-warning">
          {phase.conflict.message}
          {phase.conflict.suggestions.length > 0 && (
            <div className="flex gap-2" style={{ marginTop: 8, flexWrap: 'wrap' }}>
              {phase.conflict.suggestions.map((s) => (
                <button key={s.label} className="btn btn-sm" onClick={() => onSuggestion(s.patch)}>
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      );
    case 'previously_started':
      return (
        <div className="practice-status">
          You started <strong>{phase.title}</strong> before and put it down.
          <div className="flex gap-2" style={{ marginTop: 8 }}>
            <button className="btn btn-sm btn-primary" onClick={() => onReopen(phase.attemptId, false)}>
              Continue my saved work
            </button>
            <button className="btn btn-sm" onClick={() => onReopen(phase.attemptId, true)}>
              Start it fresh
            </button>
          </div>
        </div>
      );
    case 'active_exists':
      return (
        <div className="practice-status">
          You already have <strong>{phase.attempt.title}</strong> in progress with these settings.
          <div className="flex gap-2" style={{ marginTop: 8 }}>
            <Link className="btn btn-sm btn-primary" to={`/practice/attempt/${phase.attempt.id}`}>
              Resume it
            </Link>
            <button className="btn btn-sm" onClick={onNew}>
              New assignment
            </button>
          </div>
        </div>
      );
  }
}
