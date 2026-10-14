import { Link } from 'react-router-dom';
import type { Stack } from '../api/types';

const STACKS: { value: Stack; label: string; blurb: string }[] = [
  { value: 'python', label: 'Python', blurb: 'General-purpose, data, scripting' },
  { value: 'typescript', label: 'TypeScript', blurb: 'Typed JavaScript for large apps' },
  { value: 'cpp', label: 'C++', blurb: 'Systems, performance, low-level' },
];

export default function LearnStackSelectPage() {
  return (
    <div>
      <h1>Learn Mode</h1>
      <p>Pick a stack to see its skill tree.</p>
      <div className="grid grid-3">
        {STACKS.map((s) => (
          <Link key={s.value} to={`/learn/${s.value}`} className="card" style={{ textDecoration: 'none' }}>
            <h3>{s.label}</h3>
            <p style={{ margin: 0 }}>{s.blurb}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
