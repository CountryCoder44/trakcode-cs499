import { SeqTopic, flattenItems, topicItemsAllIn } from '../models/SeqTopic';
import { getProgressMapsByCourse } from '../repositories/seqProgress.repository';
import { Stack } from '../types/domain';

// Practice Mode <-> Sequential Curriculum coupling: a learner should never be
// served a Practice Mode problem that draws on concepts they haven't actually
// been taught in Learn Mode, unless they explicitly pick topics ahead of their
// own progress themselves (the picker on PracticeModeSelectPage.tsx lets them
// "activate" not-yet-completed topics; that explicit selection IS the ask).
// It reads live Sequential Curriculum content and is driven by an explicit
// topic selection rather than "everything done so far", since a freestanding
// Practice Mode request has no single "current lesson".

// The Learn course each Practice Mode language scopes against (see
// seqCurriculum.import.ts's COURSE_DIRS). A course with no lessons yet (C++
// today) leaves its language unscoped, with a freeform topic.
const COURSE_FOR_STACK: Partial<Record<Stack, string>> = {
  python: 'python_beginner',
  java: 'java_beginner',
  cpp: 'cpp_beginner',
};

export function courseForStack(stack: Stack): string | null {
  return COURSE_FOR_STACK[stack] ?? null;
}

/**
 * The course to scope Practice Mode against, or null when the stack has no
 * course or its course has no lessons yet (e.g. Java while it's being
 * written). Null means unscoped, freeform topic, the same as C++ today.
 */
export async function scopedCourseForStack(stack: Stack): Promise<string | null> {
  const course = courseForStack(stack);
  if (!course) return null;
  const hasContent = await SeqTopic.exists({ course, 'lessons.0': { $exists: true } });
  return hasContent ? course : null;
}

export interface ResolvedScope {
  /** Short label for the AI prompt / Problem.topic — not a precise topic name
   *  since this can span several selected topics. */
  topic: string;
  /** Fed into problemGeneration.service.ts's SCOPE CONSTRAINT block. */
  scopeHint: string;
  /** The highest of the selected topic numbers — stored on the Problem this
   *  scope produces or matches, so it can be gated for future requests. */
  requiredTopicNumber: number;
  /** False when every selected topic is concept-only (no `practical`/
   *  `checkpoint` item anywhere in the scope) — nothing executable has been
   *  taught yet, so a Deep Dive/Flash Card coding exercise has no way to stay
   *  in scope. Topic 1 in each course is like this by design
   *  (`liveCodingException`). The caller decides what to do about it. */
  hasLiveCoding: boolean;
}

// Builds the generation scope from an explicit set of topic numbers (the
// learner's picker selection, or — for Flash Card, which has no picker — their
// own completed set). Returns null when none of the numbers resolve to real
// topic content (empty selection, or a course/stub with nothing there yet).
//
// The hint lists every item's title (not just lesson titles) — coarser text
// left real gaps un-signaled the first time this kind of scoping was tried
// (a lesson-level hint wasn't enough to stop generation from assuming stdin
// reading before it was taught).
// Item titles are compact enough to list in full for a handful of topics and
// give the model no room to assume an unlisted construct is "basic enough".
export async function resolveTopicScope(course: string, topicNumbers: number[]): Promise<ResolvedScope | null> {
  const numbers = [...new Set(topicNumbers)].filter((n) => Number.isInteger(n) && n > 0);
  if (numbers.length === 0) return null;

  const topics = await SeqTopic.find({ course, topicNumber: { $in: numbers } }).sort({ topicNumber: 1 });
  const withContent = topics.filter((t) => flattenItems(t).length > 0);
  if (withContent.length === 0) return null;

  const requiredTopicNumber = Math.max(...withContent.map((t) => t.topicNumber));
  const hasLiveCoding = withContent.some((t) => flattenItems(t).some(({ item }) => item.type !== 'concept'));

  const lines = withContent.map((t) => {
    const flat = flattenItems(t);
    const codeTaught = flat.some(({ item }) => item.type !== 'concept');
    const items = flat.map(({ item }) => item.title).join('; ');
    return (
      `- Topic ${t.topicNumber}: ${t.title}${codeTaught ? '' : ' (concept-only — no runnable code taught in this topic)'}.\n` +
      `  Covers: ${items}.`
    );
  });
  const topic =
    withContent.length === 1
      ? withContent[0].title
      : `${withContent[0].title} through ${withContent[withContent.length - 1].title} (${withContent.length} topics)`;

  const scopeHint = lines.join('\n');
  return {
    topic,
    scopeHint: scopeHint.length > 4000 ? scopeHint.slice(0, 4000) + '…' : scopeHint,
    requiredTopicNumber,
    hasLiveCoding,
  };
}

// The learner's own real completed-topic numbers for a course — the default
// scope for anything that has no picker of its own (Flash Card today). Mirrors
// seq.controller.ts's progressForCourse, minus the fields Practice Mode doesn't
// need.
export async function getCompletedTopicNumbers(userId: string, course: string): Promise<number[]> {
  const topics = await SeqTopic.find({ course }).select('topicNumber lessons checkpoint');
  const { passed } = await getProgressMapsByCourse(userId, course);
  return topics.filter((t) => topicItemsAllIn(t, passed)).map((t) => t.topicNumber);
}
