import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { learnApi } from '../api/endpoints';
import type { CurriculumTreeItem, Stack } from '../api/types';
import { ApiError } from '../api/client';

const LEVEL_LABEL: Record<CurriculumTreeItem['level'], string> = {
  intro: 'Intro',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export default function LearnTreePage() {
  const { stack } = useParams<{ stack: Stack }>();
  const [items, setItems] = useState<CurriculumTreeItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!stack) return;
    setItems(null);
    learnApi
      .listCurriculum(stack)
      .then((res) => setItems(res.items))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load curriculum'));
  }, [stack]);

  const completedCount = items?.filter((i) => i.status === 'complete').length ?? 0;

  return (
    <div>
      <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
        <h1 style={{ margin: 0, textTransform: 'capitalize' }}>{stack} skill tree</h1>
        <Link to="/learn" className="text-dim" style={{ fontSize: 13 }}>
          ← Change stack
        </Link>
      </div>
      {items && (
        <p>
          {completedCount} / {items.length} complete
        </p>
      )}
      {error && <div className="error-banner">{error}</div>}

      {!items && !error && (
        <div className="empty-state">
          <span className="spinner" />
        </div>
      )}

      {items && items.length === 0 && !error && (
        <div className="empty-state">
          <p>No lessons here yet — this track is still being built.</p>
        </div>
      )}

      <div className="flex-col">
        {items?.map((item, i) => (
          <div key={item.id}>
            {i > 0 && <div className="tree-connector" />}
            <Link
              to={item.locked ? '#' : `/learn/${stack}/${item.id}`}
              className={`tree-item${item.locked ? ' locked' : ''}`}
              style={{ textDecoration: 'none', color: 'inherit', cursor: item.locked ? 'not-allowed' : 'pointer' }}
              onClick={(e) => item.locked && e.preventDefault()}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  background:
                    item.status === 'complete'
                      ? 'var(--success-dim)'
                      : item.locked
                        ? 'var(--bg-elevated-2)'
                        : 'var(--accent-dim)',
                  color: item.status === 'complete' ? 'var(--success)' : 'var(--accent-hover)',
                  fontSize: 14,
                }}
              >
                {item.locked ? '🔒' : item.status === 'complete' ? '✓' : i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div className="flex items-center gap-2">
                  <strong>{item.title}</strong>
                  <span className="badge badge-neutral">{LEVEL_LABEL[item.level]}</span>
                  {item.status === 'in_progress' && <span className="badge badge-warning">In progress</span>}
                </div>
                <p style={{ margin: '2px 0 0', fontSize: 13.5 }}>{item.description}</p>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
