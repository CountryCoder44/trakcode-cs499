import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { practiceApi } from '../api/endpoints';
import type { Difficulty, ProblemType, Stack } from '../api/types';
import { ApiError } from '../api/client';

type Mode = 'deep_dive' | 'flash';

export default function PracticeModeSelectPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('deep_dive');
  const [stack, setStack] = useState<Stack>('python');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [flashType, setFlashType] = useState<Extract<ProblemType, 'flash_bug' | 'flash_fill'>>('flash_bug');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleStart() {
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'deep_dive') {
        const { problem } = await practiceApi.requestDeepDive({ stack, topic: topic.trim() || undefined, difficulty });
        navigate(`/practice/workspace/${problem.id}`);
      } else {
        navigate(`/practice/flash?stack=${stack}&type=${flashType}`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start practice');
    } finally {
      setSubmitting(false);
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
            <option value="mern">MERN</option>
            <option value="cpp">C++</option>
          </select>
        </div>

        {mode === 'deep_dive' ? (
          <>
            <div className="field">
              <label htmlFor="topic">Topic (optional)</label>
              <input
                id="topic"
                className="input"
                placeholder="e.g. recursion, hash maps"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="difficulty">Difficulty</label>
              <select
                id="difficulty"
                className="input"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="interview">Interview</option>
              </select>
            </div>
          </>
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
          </div>
        )}

        <button className="btn btn-primary btn-block" onClick={handleStart} disabled={submitting}>
          {submitting ? <span className="spinner" /> : mode === 'deep_dive' ? 'Start deep dive' : 'Start flash cards'}
        </button>
      </div>
    </div>
  );
}
