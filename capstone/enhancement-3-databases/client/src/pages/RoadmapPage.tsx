import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { roadmapApi } from '../api/endpoints';
import type { RoadmapRequest } from '../api/types';
import { ApiError } from '../api/client';

const STATUS_LABEL: Record<RoadmapRequest['status'], string> = {
  requested: 'Requested',
  planned: 'Planned',
  in_progress: 'In Progress',
  live: 'Live',
};
const STATUS_BADGE: Record<RoadmapRequest['status'], string> = {
  requested: 'badge-neutral',
  planned: 'badge-accent',
  in_progress: 'badge-warning',
  live: 'badge-success',
};

export default function RoadmapPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<RoadmapRequest[] | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    roadmapApi
      .list()
      .then((res) => setRequests(res.requests))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load roadmap'));
  }

  useEffect(load, []);

  async function handleVote(id: string) {
    if (!user) {
      setError('Log in to vote');
      return;
    }
    try {
      await roadmapApi.vote(id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Vote failed');
    }
  }

  async function handleSubmitRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      setError('Log in to request a skill');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await roadmapApi.request({ title, description });
      setTitle('');
      setDescription('');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Request failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1>Skill Roadmap</h1>
      <p>Vote on what TrakCode should teach next.</p>

      {error && <div className="error-banner">{error}</div>}

      <div className="card" style={{ marginBottom: 24 }}>
        <h3>Request a skill</h3>
        <form onSubmit={handleSubmitRequest}>
          <div className="field">
            <label htmlFor="title">Title</label>
            <input
              id="title"
              className="input"
              placeholder="e.g. Add Go"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="description">Why?</label>
            <textarea
              id="description"
              className="input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? <span className="spinner" /> : 'Submit request'}
          </button>
        </form>
      </div>

      {!requests ? (
        <div className="empty-state">
          <span className="spinner" />
        </div>
      ) : requests.length === 0 ? (
        <div className="empty-state">No requests yet — be the first!</div>
      ) : (
        <div className="flex-col gap-3">
          {requests.map((r) => (
            <div key={r.id} className="card flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
                  <strong>{r.title}</strong>
                  <span className={`badge ${STATUS_BADGE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                </div>
                {r.description && <p style={{ margin: 0, fontSize: 13.5 }}>{r.description}</p>}
              </div>
              <button
                className={`btn btn-sm${r.votedByViewer ? ' btn-primary' : ''}`}
                onClick={() => handleVote(r.id)}
              >
                ▲ {r.votes}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
