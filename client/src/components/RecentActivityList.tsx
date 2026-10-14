import { useState } from 'react';
import type { HeatmapEntry } from '../api/types';
import { formatDisplayDate } from '../utils/formatDate';
import ActivityTooltip from './ActivityTooltip';

interface RecentActivityListProps {
  entries: HeatmapEntry[];
  emptyLabel: string;
  itemLabel: (count: number) => string; // e.g. "lesson completed" / "lessons completed" — matches the stat tiles above
  maxDays?: number;
}

// A compact side panel sitting INLINE with the Heatmap, in the same bar —
// not a separate section stacked below it. A full-year grid is mostly empty
// for any account without a year of history; this fills that dead space
// directly, and the grid's own empty leading weeks just fall into its
// existing horizontal scroll area instead of wasting card width showing
// nothing. Narrow (~180px), so each day is two short lines rather than one
// long one. Hover a day for the same rich item-list popup the heatmap's own
// cells show (ActivityTooltip).
export default function RecentActivityList({ entries, emptyLabel, itemLabel, maxDays = 3 }: RecentActivityListProps) {
  const [hover, setHover] = useState<{ day: HeatmapEntry; rect: DOMRect } | null>(null);
  const recentDays = [...entries].reverse().slice(0, maxDays);

  return (
    <div className="recent-activity">
      <div className="text-dim" style={{ fontSize: 11, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 }}>
        Recent
      </div>
      {recentDays.length === 0 ? (
        <div className="text-dim" style={{ fontSize: 12 }}>
          {emptyLabel}
        </div>
      ) : (
        recentDays.map((day) => (
          <div
            key={day.date}
            style={{ fontSize: 12, padding: '3px 0', cursor: 'pointer' }}
            onMouseEnter={(e) => setHover({ day, rect: e.currentTarget.getBoundingClientRect() })}
            onMouseLeave={() => setHover(null)}
          >
            <div>{formatDisplayDate(day.date)}</div>
            <div className="text-dim">
              {day.count} {itemLabel(day.count)}
            </div>
          </div>
        ))
      )}
      {hover && <ActivityTooltip date={hover.day.date} items={hover.day.items} rect={hover.rect} />}
    </div>
  );
}
