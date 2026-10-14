import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Stack } from '../api/types';

const STACKS: { value: Stack; label: string; blurb: string }[] = [
  { value: 'python', label: 'Python', blurb: 'General-purpose, data, scripting' },
  { value: 'typescript', label: 'TypeScript', blurb: 'Typed JavaScript for large apps' },
  { value: 'cpp', label: 'C++', blurb: 'Systems, performance, low-level' },
];

const LEVELS = [
  { value: 'intro', label: 'Just starting out' },
  { value: 'intermediate', label: 'Know the basics' },
  { value: 'advanced', label: 'Pretty experienced' },
] as const;

export const PREFERRED_STACK_KEY = 'trakcode_preferred_stack';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [stack, setStack] = useState<Stack | null>(null);
  const [level, setLevel] = useState<(typeof LEVELS)[number]['value'] | null>(null);

  function finish() {
    if (stack) localStorage.setItem(PREFERRED_STACK_KEY, stack);
    navigate('/dashboard');
  }

  return (
    <div className="container-narrow" style={{ paddingTop: 64 }}>
      <div className="flex items-center gap-3" style={{ marginBottom: 24 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'var(--accent-dim)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
          }}
        >
          👋
        </div>
        <div>
          <strong>Click</strong>
          <p style={{ margin: 0 }}>Hey! I'm Click. Let's set up your learning path — takes 10 seconds.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Which stack are you here for?</h3>
        <div className="grid grid-3">
          {STACKS.map((s) => (
            <button
              key={s.value}
              className="card"
              style={{
                textAlign: 'left',
                cursor: 'pointer',
                borderColor: stack === s.value ? 'var(--accent)' : 'var(--border)',
                background: stack === s.value ? 'var(--accent-dim)' : 'var(--bg)',
              }}
              onClick={() => setStack(s.value)}
            >
              <strong>{s.label}</strong>
              <p style={{ margin: '4px 0 0', fontSize: 13 }}>{s.blurb}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3>Where are you at?</h3>
        <div className="flex-col gap-2">
          {LEVELS.map((l) => (
            <button
              key={l.value}
              className="card"
              style={{
                textAlign: 'left',
                cursor: 'pointer',
                borderColor: level === l.value ? 'var(--accent)' : 'var(--border)',
                background: level === l.value ? 'var(--accent-dim)' : 'var(--bg)',
                padding: 12,
              }}
              onClick={() => setLevel(l.value)}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <button className="btn btn-primary btn-block" disabled={!stack || !level} onClick={finish}>
        Take me to my dashboard
      </button>
    </div>
  );
}
