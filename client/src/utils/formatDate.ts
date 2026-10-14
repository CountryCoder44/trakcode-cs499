const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Shared by Heatmap.tsx (hover tooltips) and RecentActivityList.tsx (day
// headings) — both need the exact same "Mon D, YYYY" formatting for the same
// YYYY-MM-DD heatmap date keys.
export function formatDisplayDate(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00.000Z`);
  return `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}
