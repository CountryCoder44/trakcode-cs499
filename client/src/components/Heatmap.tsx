import { useState } from 'react';
import type { HeatmapEntry } from '../api/types';
import ActivityTooltip from './ActivityTooltip';

interface HeatmapProps {
  entries: HeatmapEntry[];
  weeks?: number; // how many calendar weeks back to render
  variant: 'learning' | 'practice'; // learning = red fill, practice = green fill
}

interface DayCell {
  date: string;
  count: number;
  items: string[];
  future: boolean;
}

const WEEKDAY_ROWS: [row: number, label: string][] = [
  [1, 'Mon'],
  [3, 'Wed'],
  [5, 'Fri'],
];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Sequential scale driven by the --heat-* tokens (global.css), which are
// redefined per theme — red for a Learn Mode day, green for a Practice Mode
// day, so cell colors adapt to light/dark automatically instead of baking in
// one theme's rgba values.
function colorFor(variant: HeatmapProps['variant'], count: number): string {
  if (count <= 0) return 'var(--heat-0)';
  const scale = variant === 'learning' ? 'red' : 'green';
  const step = count === 1 ? 1 : count === 2 ? 2 : 3;
  return `var(--heat-${scale}-${step})`;
}

// Renders a GitHub-style contribution grid: real Sunday-start calendar
// weeks (not arbitrary 7-day chunks) ending on the Saturday of the current
// week, with month labels across the top and Mon/Wed/Fri row labels down the
// left side — a 1:1 layout match for GitHub's own activity tracker. Days
// after today within the final, in-progress week render as invisible
// placeholders (not zero-activity cells) to keep the grid calendar-aligned.
export default function Heatmap({ entries, weeks = 53, variant }: HeatmapProps) {
  const [hover, setHover] = useState<{ cell: DayCell; rect: DOMRect } | null>(null);
  const detailByDate = new Map(entries.map((e) => [e.date, e]));

  const today = new Date();
  const todayKey = toDateKey(today);
  const gridEnd = new Date(today);
  gridEnd.setDate(gridEnd.getDate() + (6 - today.getDay())); // the Saturday closing today's week
  const totalDays = weeks * 7;
  const gridStart = new Date(gridEnd);
  gridStart.setDate(gridStart.getDate() - totalDays + 1); // a Sunday, since totalDays is a multiple of 7

  const columns: DayCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: DayCell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(gridStart);
      date.setDate(date.getDate() + w * 7 + d);
      const key = toDateKey(date);
      const detail = detailByDate.get(key);
      col.push({ date: key, count: detail?.count ?? 0, items: detail?.items ?? [], future: key > todayKey });
    }
    columns.push(col);
  }

  let prevMonth = -1;
  const monthLabels = columns.map((col) => {
    const month = new Date(`${col[0].date}T00:00:00.000Z`).getUTCMonth();
    const label = month !== prevMonth ? MONTH_NAMES[month] : null;
    prevMonth = month;
    return label;
  });

  return (
    <div
      className="heatmap"
      role="img"
      aria-label={`Activity heatmap, ${entries.length} active day${entries.length === 1 ? '' : 's'}`}
      style={{ gridTemplateColumns: `auto repeat(${weeks}, 11px)` }}
    >
      {monthLabels.map(
        (label, i) =>
          label && (
            <div key={`m-${i}`} className="heatmap-month-label" style={{ gridColumn: i + 2, gridRow: 1 }}>
              {label}
            </div>
          )
      )}
      {WEEKDAY_ROWS.map(([row, label]) => (
        <div key={`w-${row}`} className="heatmap-weekday-label" style={{ gridColumn: 1, gridRow: row + 2 }}>
          {label}
        </div>
      ))}
      {columns.map((col, colIdx) =>
        col.map((cell, rowIdx) =>
          cell.future ? (
            <div key={cell.date} style={{ gridColumn: colIdx + 2, gridRow: rowIdx + 2 }} />
          ) : (
            <div
              key={cell.date}
              className="heatmap-cell"
              style={{ gridColumn: colIdx + 2, gridRow: rowIdx + 2, background: colorFor(variant, cell.count) }}
              onMouseEnter={(e) => setHover({ cell, rect: e.currentTarget.getBoundingClientRect() })}
              onMouseLeave={() => setHover(null)}
            />
          )
        )
      )}
      {hover && <ActivityTooltip date={hover.cell.date} items={hover.cell.items} rect={hover.rect} />}
    </div>
  );
}
