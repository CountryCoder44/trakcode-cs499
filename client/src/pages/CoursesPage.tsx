import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { seqApi } from '../api/endpoints';
import { COURSES, type CourseMeta } from '../courses';

interface Progress {
  topicCount: number | null; // null = still loading, 0 = nothing imported yet
  completed: number;
}

export default function CoursesPage() {
  const [progress, setProgress] = useState<Record<string, Progress>>({});

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
      setProgress(Object.fromEntries(results.map((r) => [r.id, { topicCount: r.topicCount, completed: r.completed }])));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex-col gap-4" style={{ maxWidth: 760, margin: '0 auto' }}>
      <div>
        <h1 style={{ marginBottom: 4 }}>Learn</h1>
        <p className="text-dim" style={{ marginTop: 0 }}>
          Pick a language. Each course is a step-by-step path of short readings, quick checks and hands-on coding.
        </p>
      </div>

      {COURSES.map((c) => (
        <CourseCard key={c.id} course={c} progress={progress[c.id] ?? { topicCount: null, completed: 0 }} />
      ))}
    </div>
  );
}

function CourseCard({ course, progress }: { course: CourseMeta; progress: Progress }) {
  const empty = progress.topicCount === 0;
  const status =
    progress.topicCount === null ? '…' : empty ? 'Coming soon' : `${progress.completed}/${progress.topicCount} topics`;

  const body = (
    <>
      <img src={course.icon} alt="" className="course-card-icon" width={64} height={64} />
      <div className="course-card-body">
        <div className="flex items-center justify-between gap-3" style={{ flexWrap: 'wrap' }}>
          <h2 className="course-card-title">{course.label}</h2>
          <span className={`course-card-status${empty ? ' soon' : ''}`}>{status}</span>
        </div>
        <p className="course-card-desc">{course.description}</p>
        <div className="course-card-uses" aria-label="Used for">
          {course.useCases.map((u) => (
            <span key={u} className="course-card-use">
              {u}
            </span>
          ))}
        </div>
      </div>
    </>
  );

  return empty ? (
    <div className="course-card course-card-disabled" aria-disabled="true">
      {body}
    </div>
  ) : (
    <Link to={`/course/${course.id}`} className="course-card">
      {body}
    </Link>
  );
}
