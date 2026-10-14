import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { seqApi } from '../api/endpoints';
import type { SeqTopicSummary } from '../api/types';
import { ApiError } from '../api/client';
import { courseMeta } from '../courses';

// A topic's `section` must be one of these three, or the page leaves it out.
const SECTION_LABEL: Record<string, string> = {
  foundations: 'Part 1: Foundations',
  core: 'Part 2: Working with Data',
  professional: 'Part 3: Problem Solving',
};
const SECTION_ORDER = ['foundations', 'core', 'professional'];

export default function SeqCoursePage() {
  const { course = 'python_beginner' } = useParams<{ course: string }>();
  const meta = courseMeta(course);
  const [topics, setTopics] = useState<SeqTopicSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [skipping, setSkipping] = useState<string | null>(null);

  function load() {
    seqApi
      .listTopics(course)
      .then((r) => setTopics(r.topics))
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load course'));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [course]);

  async function skipIntro(topicId: string) {
    setSkipping(topicId);
    try {
      await seqApi.skipTopic(topicId);
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not skip that topic');
    } finally {
      setSkipping(null);
    }
  }

  if (error) return <div className="error-banner">{error}</div>;
  if (!topics)
    return (
      <div className="empty-state">
        <span className="spinner" />
      </div>
    );

  const bySection = SECTION_ORDER.map((s) => ({
    section: s,
    items: topics.filter((t) => t.section === s).sort((a, b) => a.topicNumber - b.topicNumber),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex-col gap-4" style={{ maxWidth: 820, margin: '0 auto' }}>
      <div>
        <Link to="/courses" className="text-dim" style={{ fontSize: 13 }}>
          ← All courses
        </Link>
        <h1 style={{ marginBottom: 4, marginTop: 4 }}>{meta.label}</h1>
        <p className="text-dim" style={{ marginTop: 0 }}>
          A sequential curriculum. Each topic is a fixed run of reading checks and live-coding tasks, ending in a pass/fail
          checkpoint.
        </p>
      </div>

      {topics.length === 0 && (
        <div className="card">
          No topics imported yet for this course. Add topic <code>.md</code> files under{' '}
          <code>Sequential Curriculum/</code> and restart the server.
        </div>
      )}

      {bySection.map((group) => (
        <div key={group.section} className="flex-col gap-2">
          <h2 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-faint)', margin: '8px 0 0' }}>
            {SECTION_LABEL[group.section] ?? group.section}
          </h2>
          {group.items.map((t) => {
            const pct = t.totalItems ? Math.round((t.completedItems / t.totalItems) * 100) : 0;
            const canSkip = t.liveCodingException && t.status !== 'complete';
            return (
              <div key={t.topicId} className="flex-col gap-1">
                <Link
                  to={`/course/${course}/${t.topicId}`}
                  className="card"
                  style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="badge badge-neutral">Topic {t.topicNumber}</span>
                        {t.status === 'complete' && (
                          <span className={`badge badge-${t.skipped ? 'neutral' : 'success'}`}>
                            {t.skipped ? 'Skipped' : 'Complete'}
                          </span>
                        )}
                        {t.status === 'in_progress' && <span className="badge badge-accent">In progress</span>}
                        {t.liveCodingException && <span className="badge badge-warning">intro</span>}
                      </div>
                      <div style={{ fontWeight: 600, marginTop: 6 }}>{t.title}</div>
                      <div className="text-faint" style={{ fontSize: 12, marginTop: 2 }}>
                        {t.lessonCount} lessons · {t.completedItems}/{t.totalItems} items
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>{pct}%</div>
                  </div>
                  <div
                    style={{ height: 4, borderRadius: 2, background: 'var(--bg-elevated-2)', marginTop: 10, overflow: 'hidden' }}
                  >
                    <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)' }} />
                  </div>
                </Link>

                {canSkip && (
                  <div className="text-faint" style={{ fontSize: 12, paddingLeft: 4 }}>
                    Already comfortable with the basics?{' '}
                    <button
                      className="btn-link"
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        font: 'inherit',
                        color: 'var(--link)',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                      }}
                      onClick={() => skipIntro(t.topicId)}
                      disabled={skipping === t.topicId}
                    >
                      {skipping === t.topicId ? 'Skipping…' : 'Skip the introduction'}
                    </button>{' '}
                    and go straight to hands-on practice.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
