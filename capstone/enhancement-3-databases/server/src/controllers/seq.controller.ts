import { RequestHandler } from 'express';
import { z } from 'zod';
import {
  SeqTopic,
  ISeqTopic,
  SeqItem,
  SeqLesson,
  SeqTopicItemView,
  flattenItems,
  topicItemsAllIn,
  itemsSatisfied,
  computeOpenItemIds,
  pickDefaultOpenItem,
} from '../models/SeqTopic';
import {
  getProgressMapsByCourse,
  getProgressByTopic,
  recordAttempt,
  markTopicSkipped,
  resetTopicProgress,
} from '../repositories/seqProgress.repository';
import { gradeConcept, gradeCode, gradeLocalVerify, gradeReading, SeqGradeResult } from '../services/seqGrader';
import { SandboxLanguage } from '../services/executionClient';
import { PRACTICE_GROUPS_LAUNCHED } from '../config/constants';

// A course's `.md` files are authored in one language; that's the language the
// sandbox runs its practicals in. Unknown courses fall back to Python.
const COURSE_LANGUAGE: Record<string, SandboxLanguage> = {
  python: 'python',
  typescript: 'typescript',
  cpp: 'cpp',
};
const languageForCourse = (course: string): SandboxLanguage => COURSE_LANGUAGE[course] ?? 'python';

// ---- shaping ----

// Fisher–Yates. Concept options are shuffled on every serve so answer position
// carries no signal (authored keys skew heavily to one letter) and a learner
// can't pattern-match "always the 2nd one". Each option keeps its original
// `letter`, which is the value the client submits and the grader checks — so
// reordering is display-only and grading is unaffected. The client re-shuffles
// again after a wrong answer (no re-fetch happens there).
function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// What the learner is allowed to see: never the answer key, rationale,
// if-incorrect text, tutor notes, or raw expected output for a concept — nor,
// ordinarily, a practical's expected output either (that would hand the
// learner exactly what a print-a-literal cheat needs). The one deliberate
// exception is `practiceGroup` items (debugging exercises): the whole point
// there is repairing code to hit a known target, so `expectExactOutput` is
// shown — `require_code`/`forbid_code` are what actually stop the hardcode
// cheat, same as any other guarded practical, so revealing the target output
// costs nothing gradingwise. `isAdmin` adds the answer key (`answer` for a
// concept, `solution` for a code item) so an admin can move through their own
// content quickly — this is the only other path by which either ever reaches
// the client.
function publicItem(item: SeqItem, opts: { passed: boolean; isAdmin?: boolean }) {
  const base: Record<string, unknown> = {
    itemId: item.itemId,
    type: item.type,
    title: item.title,
    passed: opts.passed,
  };
  if (item.read) base.read = item.read;
  if (item.check) base.check = item.check;
  if (item.checkCode) base.checkCode = item.checkCode;
  if (item.options && item.options.length)
    base.options = shuffle(item.options.map((o) => ({ letter: o.letter, text: o.text })));
  if (item.do) base.do = item.do;
  if (item.brief) base.brief = item.brief;
  if (item.practiceGroup) base.practiceGroup = true;
  if (item.requirements && item.requirements.length) base.requirements = item.requirements;
  if (item.starterCode) base.starterCode = item.starterCode;
  if (item.code) base.code = item.code;
  if (item.evaluator) base.evaluator = item.evaluator;
  // Debugging exercises show their exact target output so the learner knows
  // what to aim for — every other item type keeps this server-only.
  if (item.practiceGroup && item.expectExactOutput) base.expectExactOutput = item.expectExactOutput;
  // A checkpoint's hidden-tests evaluator has no single fixed input/output —
  // that's deliberate, varied stdin/stdout is what makes hardcoding
  // functionally impossible. Revealing the FIRST case as a worked example is
  // safe for exactly that reason (it doesn't help pass the other cases) and
  // gives the learner a concrete picture of the expected shape before they
  // start, the same spirit as a debugging exercise's target output.
  if (item.type === 'checkpoint' && item.hiddenTests && item.hiddenTests.length > 0) {
    base.exampleTest = { input: item.hiddenTests[0].stdin, output: item.hiddenTests[0].stdout };
  }
  // pass_rule leaks the answer for concept items ("Learner selects B.") — only
  // surface it for code/verify items, where it just describes the check.
  if (item.passRule && item.type !== 'concept') base.passRule = item.passRule;
  // Lesson-narration clips (present only after `npm run tts:generate`).
  if (item.audio && Object.keys(item.audio).length) base.audio = item.audio;
  if (opts.isAdmin) {
    if (item.answer) base.answer = item.answer;
    if (item.solution) base.solution = item.solution;
  }
  return base;
}

// Local alias — the shared implementation lives on the model.
const allItemsIn = topicItemsAllIn;

// `practiceGroup` items (debugging exercises) stay invisible AND non-gating
// for everyone but an admin, until PRACTICE_GROUPS_LAUNCHED flips on (see
// constants.ts) — the whole feature is on hold for the launch push, but
// authoring/validation continues via admin preview. Strips hidden group
// items out of the lesson list entirely (not just locks them) so the
// gating math (computeOpenItemIds/itemsSatisfied/etc.) treats a lesson with
// a hidden group exactly as if it had no group at all — a real learner is
// never stuck waiting on content they can't even see.
function topicView(topic: ISeqTopic, includeGroups: boolean): SeqTopicItemView {
  if (includeGroups) return { lessons: topic.lessons, checkpoint: topic.checkpoint };
  return {
    lessons: topic.lessons.map(
      (l): SeqLesson => ({
        lessonId: l.lessonId,
        number: l.number,
        title: l.title,
        objective: l.objective,
        estimatedTime: l.estimatedTime,
        itemCount: l.itemCount,
        liveCodingItems: l.liveCodingItems,
        items: l.items.filter((i) => !i.practiceGroup),
      })
    ),
    checkpoint: topic.checkpoint,
  };
}

// ---- GET /api/seq/topics?course=python ----

const courseQuery = z.object({ course: z.string().default('python') });

export const listTopics: RequestHandler = async (req, res, next) => {
  try {
    const { course } = courseQuery.parse(req.query);
    const topics = await SeqTopic.find({ course }).sort({ order: 1 });
    const { passed, skipped } = await getProgressMapsByCourse(req.auth!.userId, course);
    // This overview is meant to reflect real launch scope, not an admin's
    // authoring view — unlike a topic's own detail page (which defaults to
    // hiding groups for an admin too, but has an explicit toggle to show
    // them), there's no such toggle here, so debugging exercises are always
    // excluded from these counts until PRACTICE_GROUPS_LAUNCHED flips on,
    // admin or not.
    const includeGroups = PRACTICE_GROUPS_LAUNCHED;

    const out = topics.map((t) => {
      const view = topicView(t, includeGroups);
      const flat = flattenItems(view);
      const total = flat.length;
      const done = flat.filter(({ item }) => passed.has(item.itemId)).length;
      const wasSkipped = allItemsIn(view, skipped);
      const status = allItemsIn(view, passed) ? 'complete' : done > 0 ? 'in_progress' : 'available';
      return {
        topicId: t.topicId,
        topicNumber: t.topicNumber,
        section: t.section,
        title: t.title,
        slug: t.slug,
        liveCodingException: t.liveCodingException,
        lessonCount: t.lessons.length,
        totalItems: total,
        completedItems: done,
        status,
        skipped: wasSkipped,
      };
    });

    res.json({ course, topics: out });
  } catch (err) {
    next(err);
  }
};

// ---- GET /api/seq/progress[?course=python] ----
// A learner's completion state, per course, in the leanest shape a consumer
// (Practice Mode) needs: which topics are done, how far they've reached. A
// topic counts as "complete" when every one of its items is passed (== the
// checkpoint passed, for topics that have one). Stub topics (no items) never
// count and are excluded from `contentTopics`.

async function progressForCourse(userId: string, course: string) {
  const topics = await SeqTopic.find({ course }).sort({ order: 1 });
  const { passed, skipped } = await getProgressMapsByCourse(userId, course);

  const completedTopicIds: string[] = [];
  const completedTopicNumbers: number[] = [];
  const skippedTopicIds: string[] = [];
  let currentTopicId: string | null = null;
  let contentTopics = 0;

  for (const t of topics) {
    const hasContent = flattenItems(t).length > 0;
    if (hasContent) contentTopics++;
    const done = allItemsIn(t, passed);
    if (done) {
      completedTopicIds.push(t.topicId);
      completedTopicNumbers.push(t.topicNumber);
      if (allItemsIn(t, skipped)) skippedTopicIds.push(t.topicId);
    } else if (hasContent && currentTopicId === null) {
      currentTopicId = t.topicId;
    }
  }

  return {
    course,
    totalTopics: topics.length,
    contentTopics,
    completedTopicIds,
    completedTopicNumbers,
    skippedTopicIds,
    currentTopicId,
    // The highest *contiguous* topic number reached — the simplest gate for
    // "concepts this learner has been taught". 0 if nothing is complete.
    furthestCompletedTopicNumber:
      completedTopicNumbers.length > 0 ? Math.max(...completedTopicNumbers) : 0,
  };
}

export const courseProgress: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.auth!.userId;
    const asked = typeof req.query.course === 'string' ? req.query.course : null;
    const courses = asked ? [asked] : await SeqTopic.distinct('course');
    const results = await Promise.all(courses.map((c) => progressForCourse(userId, c)));
    if (asked) {
      res.json(results[0]);
    } else {
      res.json({ courses: Object.fromEntries(results.map((r) => [r.course, r])) });
    }
  } catch (err) {
    next(err);
  }
};

// ---- GET /api/seq/topics/:topicId ----

export const getTopic: RequestHandler = async (req, res, next) => {
  try {
    const topic = await SeqTopic.findOne({ topicId: req.params.topicId });
    if (!topic) {
      res.status(404).json({ error: 'Topic not found' });
      return;
    }
    const { passed, skipped } = await getProgressByTopic(req.auth!.userId, topic.topicId);
    const isAdmin = req.auth!.role === 'admin';
    // An admin previewing "as a real learner would see it" (SeqTopicPage's
    // "Hide debugging exercises" toggle) needs the SERVER to compute gating
    // as a non-admin too, not just hide items client-side — otherwise the
    // admin's own progress is still gated on a practice-group item they can
    // no longer see or reach (the bug this param fixes). Ignored unless the
    // requester is actually an admin.
    const previewAsLearner = isAdmin && req.query.previewAsLearner === 'true';
    const includeGroups = (isAdmin && !previewAsLearner) || PRACTICE_GROUPS_LAUNCHED;
    const view = topicView(topic, includeGroups);
    const openItemIds = computeOpenItemIds(view, passed);
    const currentItemId = pickDefaultOpenItem(view, openItemIds, passed);

    res.json({
      topic: {
        topicId: topic.topicId,
        topicNumber: topic.topicNumber,
        section: topic.section,
        title: topic.title,
        slug: topic.slug,
        overview: topic.overview,
        liveCodingException: topic.liveCodingException,
      },
      lessons: view.lessons.map((l) => ({
        lessonId: l.lessonId,
        number: l.number,
        title: l.title,
        objective: l.objective ?? null,
        estimatedTime: l.estimatedTime ?? null,
        itemCount: l.itemCount ?? l.items.length,
        liveCodingItems: l.liveCodingItems ?? null,
        items: l.items.map((it) => publicItem(it, { passed: passed.has(it.itemId), isAdmin })),
      })),
      checkpoint: view.checkpoint
        ? publicItem(view.checkpoint, { passed: passed.has(view.checkpoint.itemId), isAdmin })
        : null,
      progress: {
        completedItemIds: [...passed],
        currentItemId,
        openItemIds: [...openItemIds],
        topicComplete: allItemsIn(view, passed),
        skipped: allItemsIn(view, skipped),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ---- POST /api/seq/topics/:topicId/items/:itemId/submit ----

const submitBody = z.object({
  kind: z.enum(['choice', 'code', 'text', 'ack']),
  value: z.string().max(20_000),
  // Admin-only. Grade the item but persist nothing and ignore the order lock —
  // for previewing/QA-ing lessons without leaving completion records.
  preview: z.boolean().optional(),
  // Admin-only. Compute gating (openItemIds/nextItemId) as a non-admin would —
  // see the matching param on getTopic. Must travel with every submit while the
  // "Hide debugging exercises" toggle is on, or the two calls disagree about
  // what's open and navigation dead-ends on a now-invisible item.
  previewAsLearner: z.boolean().optional(),
});

function findItem(topic: ISeqTopic, itemId: string): { item: SeqItem; lessonId: string | null } | null {
  for (const lesson of topic.lessons) {
    const found = lesson.items.find((i) => i.itemId === itemId);
    if (found) return { item: found, lessonId: lesson.lessonId };
  }
  if (topic.checkpoint && topic.checkpoint.itemId === itemId) return { item: topic.checkpoint, lessonId: null };
  return null;
}

export const submitItem: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.auth!.userId;
    const { kind, value, preview, previewAsLearner: previewAsLearnerReq } = submitBody.parse(req.body);

    // Admin-only preview: bypass the order lock, persist nothing.
    if (preview && req.auth!.role !== 'admin') {
      res.status(403).json({ error: 'Preview mode is available to admins only.' });
      return;
    }
    const isPreview = preview === true;
    const isAdmin = req.auth!.role === 'admin';
    // See the matching comment on getTopic — must agree with whatever that
    // call used, or openItemIds/nextItemId are computed against a different
    // gating view than the one the learner is currently navigating.
    const previewAsLearner = isAdmin && previewAsLearnerReq === true;
    const includeGroups = (isAdmin && !previewAsLearner) || PRACTICE_GROUPS_LAUNCHED;

    const topic = await SeqTopic.findOne({ topicId: req.params.topicId });
    if (!topic) {
      res.status(404).json({ error: 'Topic not found' });
      return;
    }
    const hit = findItem(topic, req.params.itemId);
    if (!hit) {
      res.status(404).json({ error: 'Item not found in this topic' });
      return;
    }
    const { item, lessonId } = hit;

    const view = topicView(topic, includeGroups);
    const { passed, rows } = await getProgressByTopic(userId, topic.topicId);
    const openItemIds = computeOpenItemIds(view, passed);

    // Ordering guard: only an open item (or an already-passed one) is
    // submittable — everything else is locked. Admin preview skips this.
    if (!isPreview && !passed.has(item.itemId) && !openItemIds.has(item.itemId)) {
      res.status(409).json({ error: 'This item is locked. Finish the earlier items first.' });
      return;
    }

    // ---- grade ----
    let grade: SeqGradeResult;
    if (item.type === 'concept') {
      if (kind !== 'choice') {
        res.status(400).json({ error: 'Concept items expect a choice.' });
        return;
      }
      grade = gradeConcept(item, value);
    } else if (item.type === 'reading') {
      grade = gradeReading(item);
    } else if (item.evaluator === 'local-verify') {
      if (kind !== 'text') {
        res.status(400).json({ error: 'This step expects pasted terminal output.' });
        return;
      }
      grade = gradeLocalVerify(item, value);
    } else {
      if (kind !== 'code') {
        res.status(400).json({ error: 'This step expects code.' });
        return;
      }
      grade = await gradeCode(item, value, languageForCourse(topic.course));
    }

    // ---- record (skipped entirely in admin preview) ----
    if (!isPreview) {
      const existing = rows.find((r) => r.itemId === item.itemId);
      await recordAttempt({
        userId,
        item,
        topic,
        passed: grade.passed,
        existingPassedAt: existing?.passedAt, // never move an earlier pass time
        submittedChoice: item.type === 'concept' ? value : undefined,
      });
    }

    // recompute after write
    const passed2 = new Set(passed);
    if (grade.passed && !isPreview) passed2.add(item.itemId);
    const openItemIds2 = computeOpenItemIds(view, passed2);
    const nextItemId = pickDefaultOpenItem(view, openItemIds2, passed2);

    let lessonJustCompleted: string | null = null;
    if (grade.passed && lessonId) {
      const lesson = view.lessons.find((l) => l.lessonId === lessonId);
      if (lesson && itemsSatisfied(lesson.items, passed2)) lessonJustCompleted = lessonId;
    }
    const topicComplete = allItemsIn(view, passed2);

    res.json({
      passed: grade.passed,
      preview: isPreview,
      rationale: grade.rationale ?? null,
      ifIncorrect: grade.ifIncorrect ?? null,
      message: grade.message ?? null,
      tests: grade.tests ?? null,
      stderr: grade.stderr ?? null,
      compileError: grade.compileError ?? null,
      hint: grade.hint ?? null,
      nextItemId,
      openItemIds: [...openItemIds2],
      lessonJustCompleted,
      topicComplete,
    });
  } catch (err) {
    next(err);
  }
};

// ---- POST /api/seq/topics/:topicId/skip ----
// Learner-facing: mark an entire topic complete without doing it. Scoped to the
// introductory topic (`liveCodingException`) so graded topics can't be skipped.
// Rows are stamped `skipped: true` so this is distinguishable from earned passes.
export const skipTopic: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.auth!.userId;
    const topic = await SeqTopic.findOne({ topicId: req.params.topicId });
    if (!topic) {
      res.status(404).json({ error: 'Topic not found' });
      return;
    }
    if (!topic.liveCodingException) {
      res.status(400).json({ error: 'Only the introduction can be skipped.' });
      return;
    }
    const ids = flattenItems(topic).map(({ item }) => item.itemId);
    const itemsMarked = await markTopicSkipped(userId, topic, ids);
    res.json({ ok: true, topicId: topic.topicId, itemsMarked });
  } catch (err) {
    next(err);
  }
};

// ---- POST /api/seq/topics/:topicId/reset ----

export const resetTopic: RequestHandler = async (req, res, next) => {
  try {
    const topic = await SeqTopic.findOne({ topicId: req.params.topicId });
    if (!topic) {
      res.status(404).json({ error: 'Topic not found' });
      return;
    }
    await resetTopicProgress(req.auth!.userId, topic.topicId);
    res.json({ ok: true, topicId: topic.topicId });
  } catch (err) {
    next(err);
  }
};

