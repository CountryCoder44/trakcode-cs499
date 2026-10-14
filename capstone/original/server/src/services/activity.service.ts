import { UserProgress } from '../models/UserProgress';
import { Submission } from '../models/Submission';

export interface HeatmapEntry {
  date: string; // YYYY-MM-DD (UTC)
  count: number;
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function bucketByDay(dates: Date[]): HeatmapEntry[] {
  const counts = new Map<string, number>();
  for (const d of dates) {
    const key = toDateKey(d);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Screen 9: "two heatmaps (Learning, Practice)". Learning = curriculum
// completions; Practice = submissions (any result — like a commit graph,
// attempts count as activity, not just passes).
export async function getLearningHeatmap(userId: string): Promise<HeatmapEntry[]> {
  const completions = await UserProgress.find({ userId, status: 'complete', completedAt: { $ne: null } }).select(
    'completedAt'
  );
  return bucketByDay(completions.map((c) => c.completedAt!));
}

export async function getPracticeHeatmap(userId: string): Promise<HeatmapEntry[]> {
  const submissions = await Submission.find({ userId }).select('submittedAt');
  return bucketByDay(submissions.map((s) => s.submittedAt));
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
}

// A day counts toward the streak if there was any learning or practice
// activity on it. Current streak walks back from today (or yesterday, so a
// user who hasn't opened the app yet today doesn't see their streak reset
// at midnight); longest streak scans the full history.
export function computeStreak(activeDayKeys: Set<string>): StreakInfo {
  if (activeDayKeys.size === 0) return { currentStreak: 0, longestStreak: 0 };

  const sortedDays = [...activeDayKeys].sort();
  let longestStreak = 1;
  let run = 1;
  for (let i = 1; i < sortedDays.length; i++) {
    const prev = new Date(`${sortedDays[i - 1]}T00:00:00.000Z`);
    const curr = new Date(`${sortedDays[i]}T00:00:00.000Z`);
    const dayDiff = Math.round((curr.getTime() - prev.getTime()) / 86_400_000);
    run = dayDiff === 1 ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
  }

  const today = toDateKey(new Date());
  const yesterday = toDateKey(new Date(Date.now() - 86_400_000));
  let anchor: string | null = null;
  if (activeDayKeys.has(today)) anchor = today;
  else if (activeDayKeys.has(yesterday)) anchor = yesterday;

  let currentStreak = 0;
  if (anchor) {
    currentStreak = 1;
    let cursor = new Date(`${anchor}T00:00:00.000Z`);
    for (;;) {
      cursor = new Date(cursor.getTime() - 86_400_000);
      if (activeDayKeys.has(toDateKey(cursor))) currentStreak += 1;
      else break;
    }
  }

  return { currentStreak, longestStreak };
}

export async function getActivitySummary(userId: string) {
  const [learning, practice] = await Promise.all([getLearningHeatmap(userId), getPracticeHeatmap(userId)]);
  const activeDayKeys = new Set([...learning, ...practice].map((e) => e.date));

  return {
    learningHeatmap: learning,
    practiceHeatmap: practice,
    streak: computeStreak(activeDayKeys),
    totalLessonsCompleted: learning.reduce((sum, e) => sum + e.count, 0),
    totalSubmissions: practice.reduce((sum, e) => sum + e.count, 0),
  };
}
