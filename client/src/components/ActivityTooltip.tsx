import { createPortal } from 'react-dom';
import { formatDisplayDate } from '../utils/formatDate';

interface ActivityTooltipProps {
  date: string;
  items: string[];
  rect: DOMRect;
}

// Shared by Heatmap.tsx (hovering a grid cell) and RecentActivityList.tsx
// (hovering a condensed day row) — both need the same "date heading + full
// item list" popup, portaled to document.body so it isn't clipped by either
// component's own scrolling/overflow container.
export default function ActivityTooltip({ date, items, rect }: ActivityTooltipProps) {
  return createPortal(
    <div className="heatmap-tooltip" style={{ top: rect.top - 8, left: rect.left + rect.width / 2 }}>
      <strong>{formatDisplayDate(date)}</strong>
      {items.length === 0 ? <span className="text-dim">No activity</span> : items.map((item, i) => <div key={i}>{item}</div>)}
    </div>,
    document.body
  );
}
