import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { practiceApi, seqApi } from '../api/endpoints';
import type { ProblemType, SeqTopicSummary, Stack } from '../api/types';
import { ApiError } from '../api/client';

type Mode = 'deep_dive' | 'flash';

// Sequential Curriculum courses today — matches seqPracticeScope.service.ts's
// COURSE_FOR_STACK server-side. `cpp` has no course yet, so Deep Dive for cpp
// keeps the old freeform topic text instead of a picker — nothing to scope
// against.
const COURSE_FOR_STACK: Partial<Record<Stack, string>> = { python: 'python', typescript: 'typescript' };

export default function PracticeModeSelectPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('deep_dive');
  const [stack, setStack] = useState<Stack>('python');
  const [flashType, setFlashType] = useState<Extract<ProblemType, 'flash_bug' | 'flash_fill'>>('flash_bug');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // cpp (no Sequential Curriculum course) — old freeform topic text, unscoped.
  const [freeTopic, setFreeTopic] = useState('');

  // python/typescript — a picker of the learner's own topics. Defaults to
  // everything they've completed; checking an unfinished topic is the explicit
  // "let me practice ahead of my lessons" ask.
  const [seqTopics, setSeqTopics] = useState<SeqTopicSummary[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [topicsError, setTopicsError] = useState<string | null>(null);

  const course = COURSE_FOR_STACK[stack] ?? null;

  useEffect(() => {
    if (!course) {
      setSeqTopics([]);
      setSelected(new Set());
      return;
    }
    let alive = true;
    setTopicsLoading(true);
    setTopicsError(null);
    seqApi
      .listTopics(course)
      .then(({ topics }) => {
        if (!alive) return;
        const withContent = topics.filter((t) => t.totalItems > 0);
        setSeqTopics(withContent);
        setSelected(new Set(withContent.filter((t) => t.status === 'complete').map((t) => t.topicNumber)));
      })
      .catch(() => alive && setTopicsError('Could not load your topics.'))
      .finally(() => alive && setTopicsLoading(false));
    return () => {
      alive = false;
    };
  }, [course]);

  function toggleTopic(n: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  }
  const allSelected = seqTopics.length > 0 && selected.size === seqTopics.length;
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(seqTopics.map((t) => t.topicNumber)));
  }

  async function handleStart() {
    setError(null);
    if (mode === 'deep_dive') {
      if (course && selected.size === 0) {
        setError('Pick at least one topic to practice.');
        return;
      }
      setSubmitting(true);
      try {
        const { problem } = await practiceApi.requestDeepDive(
          course
            ? { stack, topicNumbers: [...selected] }
            : { stack, topic: freeTopic.trim() || undefined }
        );
        navigate(`/practice/workspace/${problem.id}`);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Could not start practice');
      } finally {
        setSubmitting(false);
      }
    } else {
      navigate(`/practice/flash?stack=${stack}&type=${flashType}`);
    }
  }

  return (
    <div className="container-narrow">
      <h1>Practice Mode</h1>

      <div className="grid grid-2" style={{ marginBottom: 20 }}>
        <button
          className="card"
          style={{
            textAlign: 'left',
            cursor: 'pointer',
            borderColor: mode === 'deep_dive' ? 'var(--accent)' : 'var(--border)',
            background: mode === 'deep_dive' ? 'var(--accent-dim)' : 'var(--bg-elevated)',
          }}
          onClick={() => setMode('deep_dive')}
        >
          <h3 style={{ margin: 0 }}>Deep Dive</h3>
          <p style={{ margin: '4px 0 0' }}>Full workspace, real test cases, push to GitHub on pass.</p>
        </button>
        <button
          className="card"
          style={{
            textAlign: 'left',
            cursor: 'pointer',
            borderColor: mode === 'flash' ? 'var(--accent)' : 'var(--border)',
            background: mode === 'flash' ? 'var(--accent-dim)' : 'var(--bg-elevated)',
          }}
          onClick={() => setMode('flash')}
        >
          <h3 style={{ margin: 0 }}>Flash Card</h3>
          <p style={{ margin: '4px 0 0' }}>Rapid-fire single-question rounds — fix a bug or fill in the blank.</p>
        </button>
      </div>

      <div className="card">
        {error && <div className="error-banner">{error}</div>}
        <div className="field">
          <label htmlFor="stack">Stack</label>
          <select id="stack" className="input" value={stack} onChange={(e) => setStack(e.target.value as Stack)}>
            <option value="python">Python</option>
            <option value="typescript">TypeScript</option>
            <option value="cpp">C++</option>
          </select>
        </div>

        {mode === 'deep_dive' ? (
          course ? (
            <div className="field">
              <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                <label style={{ margin: 0 }}>Topics</label>
                {seqTopics.length > 0 && (
                  <button type="button" className="btn btn-sm" onClick={toggleAll}>
                    {allSelected ? 'Clear all' : 'Select all'}
                  </button>
                )}
              </div>
              <p className="text-faint" style={{ margin: '0 0 8px', fontSize: 13 }}>
                Checked by default: everything you've completed in Learn Mode. Check a topic you haven't finished
                yet to practice ahead of your lessons on purpose.
              </p>
              {topicsLoading ? (
                <span className="spinner" />
              ) : topicsError ? (
                <div className="error-banner">{topicsError}</div>
              ) : seqTopics.length === 0 ? (
                <p className="text-dim">No Learn Mode topics yet for this stack.</p>
              ) : (
                <div className="flex-col gap-1" style={{ maxHeight: 320, overflowY: 'auto' }}>
                  {seqTopics.map((t) => (
                    <label
                      key={t.topicId}
                      className="flex items-center gap-2"
                      style={{
                        padding: '6px 8px',
                        borderRadius: 'var(--radius)',
                        background: selected.has(t.topicNumber) ? 'var(--bg-elevated-2)' : 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(t.topicNumber)}
                        onChange={() => toggleTopic(t.topicNumber)}
                      />
                      <span style={{ flex: 1 }}>
                        {t.topicNumber}. {t.title}
                      </span>
                      {t.status === 'complete' ? (
                        <span className="badge badge-success">done</span>
                      ) : t.status === 'in_progress' ? (
                        <span className="badge badge-warning">in progress</span>
                      ) : (
                        <span className="badge badge-neutral">not started</span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="field">
              <label htmlFor="topic">Topic (optional)</label>
              <input
                id="topic"
                className="input"
                placeholder="e.g. recursion, hash maps"
                value={freeTopic}
                onChange={(e) => setFreeTopic(e.target.value)}
              />
              <p className="text-faint" style={{ margin: '4px 0 0', fontSize: 12 }}>
                No Learn Mode course for C++ yet, so this isn't scoped to specific lessons.
              </p>
            </div>
          )
        ) : (
          <div className="field">
            <label htmlFor="flashType">Flash card type</label>
            <select
              id="flashType"
              className="input"
              value={flashType}
              onChange={(e) => setFlashType(e.target.value as typeof flashType)}
            >
              <option value="flash_bug">Flash Bug — find and fix the bug</option>
              <option value="flash_fill">Flash Fill — fill in the blank</option>
            </select>
            {course && (
              <p className="text-faint" style={{ margin: '4px 0 0', fontSize: 12 }}>
                Scoped automatically to what you've completed in Learn Mode.
              </p>
            )}
          </div>
        )}

        <button className="btn btn-primary btn-block" onClick={handleStart} disabled={submitting}>
          {submitting ? <span className="spinner" /> : mode === 'deep_dive' ? 'Start deep dive' : 'Start flash cards'}
        </button>
      </div>
    </div>
  );
}
