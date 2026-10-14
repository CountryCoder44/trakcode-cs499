import type { HeatmapEntry } from '../api/types';

interface HeatmapProps {
  entries: HeatmapEntry[];
  weeks?: number; // how many weeks back to render
}

// Sequential scale driven by the --heat-* tokens (global.css), which are
// redefined per theme — so cell colors adapt to light/dark automatically
// instead of baking in one theme's rgba values.
function colorFor(count: number): string {
  if (count <= 0) return 'var(--heat-0)';
  if (count === 1) return 'var(--heat-1)';
  if (count === 2) return 'var(--heat-2)';
  return 'var(--heat-3)';
}

// Renders a GitHub-style contribution grid for the last N weeks, ending today.
export default function Heatmap({ entries, weeks = 18 }: HeatmapProps) {
  const countByDate = new Map(entries.map((e) => [e.date, e.count]));

  const today = new Date();
  const days: { date: string; count: number }[] = [];
  const totalDays = weeks * 7;
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, count: countByDate.get(key) ?? 0 });
  }

  return (
    <div className="heatmap" role="img" aria-label={`Activity heatmap, ${entries.length} active days`}>
      {days.map((d) => (
        <div key={d.date} className="heatmap-cell" style={{ background: colorFor(d.count) }} title={`${d.date}: ${d.count}`} />
      ))}
    </div>
  );
}
