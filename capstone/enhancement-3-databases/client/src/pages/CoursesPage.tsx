import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { seqApi } from '../api/endpoints';
import { COURSES } from '../courses';

interface Row {
  id: string;
  label: string;
  blurb: string;
  topicCount: number | null; // null = still loading, 0 = nothing imported yet
  completed: number;
}

export default function CoursesPage() {
  const [rows, setRows] = useState<Row[]>(
    COURSES.map((c) => ({ id: c.id, label: c.label, blurb: c.blurb, topicCount: null, completed: 0 }))
  );

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      COURSES.map((c) =>
        seqApi
          .listTopics(c.id)
          .then((r) => ({
            id: c.id,
            topicCount: r.topics.length,
            completed: r.topics.filter((t) => t.status === 'complete').length,
          }))
          .catch(() => ({ id: c.id, topicCount: 0, completed: 0 }))
      )
    ).then((results) => {
      if (cancelled) return;
      setRows((prev) =>
        prev.map((row) => {
          const hit = results.find((x) => x.id === row.id);
          return hit ? { ...row, topicCount: hit.topicCount, completed: hit.completed } : row;
        })
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex-col gap-4" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div>
        <h1 style={{ marginBottom: 4 }}>Learn</h1>
        <p className="text-dim" style={{ marginTop: 0 }}>
          Pick a language. Each course is a sequential, pass/fail curriculum — short readings, focused checks, and
          live-coding tasks, each topic ending in a checkpoint.
        </p>
      </div>

      {rows.map((row) => {
        const empty = row.topicCount === 0;
        return (
          <Link
            key={row.id}
            to={`/course/${row.id}`}
            className="card"
            style={{
              display: 'block',
              textDecoration: 'none',
              color: 'inherit',
              opacity: empty ? 0.6 : 1,
              pointerEvents: empty ? 'none' : undefined,
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div style={{ fontWeight: 600, fontSize: 18 }}>{row.label}</div>
              <span className="text-faint" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                {row.topicCount === null
                  ? '…'
                  : empty
                    ? 'Coming soon'
                    : `${row.completed}/${row.topicCount} topics`}
              </span>
            </div>
            <p className="text-dim" style={{ margin: '6px 0 0', fontSize: 14 }}>
              {row.blurb}
            </p>
          </Link>
        );
      })}
    </div>
  );
}
