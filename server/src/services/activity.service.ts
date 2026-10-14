import { SeqProgress } from '../models/SeqProgress';
import { SeqTopic, flattenItems } from '../models/SeqTopic';
import { Submission } from '../models/Submission';

export interface HeatmapEntry {
  date: string; // YYYY-MM-DD (UTC)
  count: number;
  items: string[]; // human-readable description of each thing completed that day
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function bucketByDay(entries: { date: Date; label: string }[]): HeatmapEntry[] {
  const byDay = new Map<string, string[]>();
  for (const { date, label } of entries) {
    const key = toDateKey(date);
    const list = byDay.get(key);
    if (list) list.push(label);
    else byDay.set(key, [label]);
  }
  return [...byDay.entries()]
    .map(([date, items]) => ({ date, count: items.length, items }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Screen 9: "two heatmaps (Learning, Practice)". Learning = Sequential
// Curriculum item passes (SeqProgress.passedAt), the source of Learn Mode
// completion.
// Practice = submissions (any result — like a commit graph, attempts count
// as activity, not just passes).
export async function getLearningHeatmap(userId: string): Promise<HeatmapEntry[]> {
  const rows = await SeqProgress.find({ userId, passedAt: { $ne: null } }).select('passedAt topicId itemId');
  if (rows.length === 0) return [];

  const topicIds = [...new Set(rows.map((r) => r.topicId))];
  const topics = await SeqTopic.find({ topicId: { $in: topicIds } });
  const topicMeta = new Map<string, { title: string; itemTitles: Map<string, string> }>();
  for (const topic of topics) {
    const itemTitles = new Map<string, string>();
    for (const { item } of flattenItems(topic)) itemTitles.set(item.itemId, item.title);
    topicMeta.set(topic.topicId, { title: topic.title, itemTitles });
  }

  const entries = rows.map((r) => {
    const meta = topicMeta.get(r.topicId);
    const itemTitle = meta?.itemTitles.get(r.itemId) ?? r.itemId;
    return { date: r.passedAt!, label: meta ? `${meta.title}: ${itemTitle}` : itemTitle };
  });
  return bucketByDay(entries);
}

export async function getPracticeHeatmap(userId: string): Promise<HeatmapEntry[]> {
  const submissions = await Submission.find({ userId })
    .select('submittedAt problemId result')
    .populate('problemId', 'topic difficulty');

  const entries = submissions.map((s) => {
    const problem = s.problemId as unknown as { topic: string; difficulty: string } | null;
    const label = problem ? `${problem.topic} (${problem.difficulty}): ${s.result}` : `Practice submission: ${s.result}`;
    return { date: s.submittedAt, label };
  });
  return bucketByDay(entries);
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
}

// A day counts toward the streak if there was activity of THIS kind on it —
// called separately for learning and practice days so the two streaks track
// independently rather than crediting a practice-only day toward a learning
// streak or vice versa. Current streak walks back from today (or yesterday,
// so a user who hasn't opened the app yet today doesn't see their streak
// reset at midnight); longest streak scans the full history.
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

  return {
    learningHeatmap: learning,
    practiceHeatmap: practice,
    learningStreak: computeStreak(new Set(learning.map((e) => e.date))),
    practiceStreak: computeStreak(new Set(practice.map((e) => e.date))),
    totalLessonsCompleted: learning.reduce((sum, e) => sum + e.count, 0),
    totalSubmissions: practice.reduce((sum, e) => sum + e.count, 0),
  };
}
