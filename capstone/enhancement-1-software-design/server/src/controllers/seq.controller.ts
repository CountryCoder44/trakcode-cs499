import { RequestHandler } from 'express';
import { z } from 'zod';
import { SeqTopic, ISeqTopic, SeqItem, flattenItems, topicItemsAllIn } from '../models/SeqTopic';
import { SeqProgress } from '../models/SeqProgress';
import { gradeConcept, gradeCode, gradeLocalVerify, SeqGradeResult } from '../services/seqGrader';
import { SandboxLanguage } from '../services/executionClient';

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
// if-incorrect text, tutor notes, or raw expected output for a concept.
// `isAdmin` adds the answer key (`answer` for a concept, `solution` for a code
// item) so an admin can move through their own content quickly — this is the
// only path by which either ever reaches the client.
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
  if (item.requirements && item.requirements.length) base.requirements = item.requirements;
  if (item.starterCode) base.starterCode = item.starterCode;
  if (item.code) base.code = item.code;
  if (item.evaluator) base.evaluator = item.evaluator;
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

function progressMaps(rows: { itemId: string; passedAt?: Date; skipped?: boolean }[]) {
  const passed = new Set(rows.filter((r) => r.passedAt).map((r) => r.itemId));
  const skipped = new Set(rows.filter((r) => r.passedAt && r.skipped).map((r) => r.itemId));
  return { passed, skipped };
}

function computeCurrent(topic: ISeqTopic, passed: Set<string>): string | null {
  for (const { item } of flattenItems(topic)) {
    if (!passed.has(item.itemId)) return item.itemId;
  }
  return null; // everything passed
}

// Local alias — the shared implementation lives on the model.
const allItemsIn = topicItemsAllIn;

// ---- GET /api/seq/topics?course=python ----

const courseQuery = z.object({ course: z.string().default('python') });

export const listTopics: RequestHandler = async (req, res, next) => {
  try {
    const { course } = courseQuery.parse(req.query);
    const topics = await SeqTopic.find({ course }).sort({ order: 1 });
    const rows = await SeqProgress.find({ userId: req.auth!.userId, course }).select('itemId passedAt skipped topicId');
    const { passed, skipped } = progressMaps(rows);

    const out = topics.map((t) => {
      const flat = flattenItems(t);
      const total = flat.length;
      const done = flat.filter(({ item }) => passed.has(item.itemId)).length;
      const wasSkipped = allItemsIn(t, skipped);
      const status = allItemsIn(t, passed) ? 'complete' : done > 0 ? 'in_progress' : 'available';
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
  const rows = await SeqProgress.find({ userId, course }).select('itemId passedAt skipped');
  const { passed, skipped } = progressMaps(rows);

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
    const rows = await SeqProgress.find({ userId: req.auth!.userId, topicId: topic.topicId }).select('itemId passedAt skipped');
    const { passed, skipped } = progressMaps(rows);
    const currentItemId = computeCurrent(topic, passed);
    const isAdmin = req.auth!.role === 'admin';

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
      lessons: topic.lessons.map((l) => ({
        lessonId: l.lessonId,
        number: l.number,
        title: l.title,
        objective: l.objective ?? null,
        estimatedTime: l.estimatedTime ?? null,
        itemCount: l.itemCount ?? l.items.length,
        liveCodingItems: l.liveCodingItems ?? null,
        items: l.items.map((it) => publicItem(it, { passed: passed.has(it.itemId), isAdmin })),
      })),
      checkpoint: topic.checkpoint
        ? publicItem(topic.checkpoint, { passed: passed.has(topic.checkpoint.itemId), isAdmin })
        : null,
      progress: {
        completedItemIds: [...passed],
        currentItemId,
        topicComplete: allItemsIn(topic, passed),
        skipped: allItemsIn(topic, skipped),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ---- POST /api/seq/topics/:topicId/items/:itemId/submit ----

const submitBody = z.object({
  kind: z.enum(['choice', 'code', 'text']),
  value: z.string().max(20_000),
  // Admin-only. Grade the item but persist nothing and ignore the order lock —
  // for previewing/QA-ing lessons without leaving completion records.
  preview: z.boolean().optional(),
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
    const { kind, value, preview } = submitBody.parse(req.body);

    // Admin-only preview: bypass the order lock, persist nothing.
    if (preview && req.auth!.role !== 'admin') {
      res.status(403).json({ error: 'Preview mode is available to admins only.' });
      return;
    }
    const isPreview = preview === true;

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

    const rows = await SeqProgress.find({ userId, topicId: topic.topicId }).select('itemId passedAt');
    const { passed } = progressMaps(rows);
    const currentItemId = computeCurrent(topic, passed);

    // Ordering guard: only the current item (or an already-passed one) is
    // submittable. Everything after `currentItemId` is locked. Admin preview
    // skips this.
    if (!isPreview && !passed.has(item.itemId) && currentItemId !== item.itemId) {
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
      const set: Record<string, unknown> = {};
      if (item.type === 'concept') set.lastChoice = value.toUpperCase().replace(/\s/g, '');
      if (grade.passed) set.passedAt = existing?.passedAt ?? new Date(); // never move an earlier pass time
      await SeqProgress.findOneAndUpdate(
        { userId, itemId: item.itemId },
        {
          $inc: { attempts: 1 },
          $setOnInsert: { course: topic.course, topicId: topic.topicId },
          ...(Object.keys(set).length ? { $set: set } : {}),
        },
        { upsert: true }
      );
    }

    // recompute after write
    const passed2 = new Set(passed);
    if (grade.passed && !isPreview) passed2.add(item.itemId);
    const nextItemId = computeCurrent(topic, passed2);

    let lessonJustCompleted: string | null = null;
    if (grade.passed && lessonId) {
      const lesson = topic.lessons.find((l) => l.lessonId === lessonId)!;
      if (lesson.items.every((i) => passed2.has(i.itemId))) lessonJustCompleted = lessonId;
    }
    const topicComplete = allItemsIn(topic, passed2);

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
    const now = new Date();
    const ids = flattenItems(topic).map(({ item }) => item.itemId);
    await SeqProgress.bulkWrite(
      ids.map((itemId) => ({
        updateOne: {
          filter: { userId, itemId },
          update: {
            $setOnInsert: { course: topic.course, topicId: topic.topicId },
            $set: { passedAt: now, skipped: true },
          },
          upsert: true,
        },
      }))
    );
    res.json({ ok: true, topicId: topic.topicId, itemsMarked: ids.length });
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
    await SeqProgress.deleteMany({ userId: req.auth!.userId, topicId: topic.topicId });
    res.json({ ok: true, topicId: topic.topicId });
  } catch (err) {
    next(err);
  }
};
