import { Schema, model, Document } from 'mongoose';

// "Sequential Curriculum" — the hand-authored, ordered pass/fail lesson package
// under `Sequential Curriculum/` at the repo root. Deliberately a SEPARATE model
// from `CurriculumItem` / Learn Mode: this represents the new structured format
// (topic -> lessons -> ordered items, each a concept check or a live-coding
// task, plus a topic-ending checkpoint), imported verbatim from the `.md`
// source of truth. See server/src/seeds/seqCurriculum.parse.ts.

export type SeqItemType = 'concept' | 'practical' | 'checkpoint' | 'reading';
export type SeqEvaluator =
  | 'mc'
  | 'browser-exec'
  | 'hidden-tests'
  | 'local-verify'
  | 'branch-select';

export interface SeqOption {
  letter: string;
  text: string;
}
export interface SeqHiddenTest {
  stdin: string;
  stdout: string;
}

export interface SeqItem {
  itemId: string; // stable, e.g. "py-2.1-04" / "py-2.CP"
  type: SeqItemType;
  title: string;

  // concept / branch-select
  read?: string;
  check?: string;
  checkCode?: string; // optional fenced code block the question refers to
  options?: SeqOption[];
  answer?: string; // "B" or "A,C"
  rationale?: string;
  ifIncorrect?: string;
  branchKey?: string;

  // practical / checkpoint
  do?: string;
  brief?: string;
  requirements?: string[];
  starterCode?: string;
  code?: string; // read-only illustrative code shown with the prompt
  solution?: string; // admin answer key — only ever sent to an admin client

  evaluator?: SeqEvaluator;
  expectExactOutput?: string;
  expectOutputContains?: string;
  expectExitCode?: number;
  // Source assertions, checked after the run's output already matched. Regex
  // strings: every `requireCode` must match the submission, no `forbidCode` may.
  // Server-only — never sent to the client (see publicItem).
  requireCode?: string[];
  forbidCode?: string[];
  acceptPattern?: string;
  acceptCommands?: string[];
  hiddenTests?: SeqHiddenTest[];

  // Concept-tag metadata, for a future Practice Mode scoping refinement.
  // Server-only for now, same as requireCode/forbidCode; not yet consumed by
  // any grading or practice-scoping logic — captured at authoring time so it
  // doesn't need retrofitting once that logic is built.
  conceptsRequired?: string[];
  conceptsIntroduced?: string[];

  // shared
  tutor?: string;
  passRule?: string;

  // Optional pick-any-one-of-N bonus pool, appended after a lesson's required
  // items (e.g. a set of debugging exercises). See computeOpenItemIds/
  // itemsSatisfied below and _FORMAT.md's "practice_group" rule.
  practiceGroup?: boolean;

  // Lesson-narration audio, attached by the importer from
  // `Sequential Curriculum/Python/audio/manifest.json`. Absent until
  // `npm run tts:generate` has produced clips. Keyed by prose field.
  audio?: {
    read?: { src: string; timings: string; durationSec: number };
    do?: { src: string; timings: string; durationSec: number };
    brief?: { src: string; timings: string; durationSec: number };
    question?: { src: string; timings: string; durationSec: number }; // concept question stem
    options?: Record<string, { src: string; timings: string; durationSec: number }>; // one per choice, keyed by letter
    requirements?: Record<string, { src: string; timings: string; durationSec: number }>; // one per bullet, keyed by its index in `requirements`
  };
}

export interface SeqLesson {
  lessonId: string; // "py-2.1"
  number: string; // "2.1"
  title: string;
  objective?: string;
  estimatedTime?: string;
  itemCount?: number;
  liveCodingItems?: number;
  items: SeqItem[];
}

export interface ISeqTopic extends Document {
  topicId: string; // "py-topic-02"
  course: string; // "python"
  section: string; // foundations | core | professional
  topicNumber: number;
  order: number; // == topicNumber, kept explicit for sort
  title: string;
  slug: string;
  overview: string;
  liveCodingException: boolean;
  lessons: SeqLesson[];
  checkpoint: SeqItem | null; // absent for concept-only topics
  sourceFile: string; // relative path of the .md it was imported from
  importedAt: Date;
}

const optionSchema = new Schema<SeqOption>(
  { letter: String, text: String },
  { _id: false }
);
const hiddenTestSchema = new Schema<SeqHiddenTest>(
  { stdin: String, stdout: String },
  { _id: false }
);

const itemSchema = new Schema<SeqItem>(
  {
    itemId: { type: String, required: true },
    type: { type: String, enum: ['concept', 'practical', 'checkpoint', 'reading'], required: true },
    title: { type: String, required: true },

    read: String,
    check: String,
    checkCode: String,
    options: [optionSchema],
    answer: String,
    rationale: String,
    ifIncorrect: String,
    branchKey: String,

    do: String,
    brief: String,
    requirements: [String],
    starterCode: String,
    code: String,
    solution: String,

    evaluator: { type: String, enum: ['mc', 'browser-exec', 'hidden-tests', 'local-verify', 'branch-select'] },
    expectExactOutput: String,
    expectOutputContains: String,
    expectExitCode: Number,
    requireCode: [String],
    forbidCode: [String],
    conceptsRequired: [String],
    conceptsIntroduced: [String],
    acceptPattern: String,
    acceptCommands: [String],
    hiddenTests: [hiddenTestSchema],

    tutor: String,
    passRule: String,
    practiceGroup: Boolean,

    audio: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const lessonSchema = new Schema<SeqLesson>(
  {
    lessonId: { type: String, required: true },
    number: { type: String, required: true },
    title: { type: String, required: true },
    objective: String,
    estimatedTime: String,
    itemCount: Number,
    liveCodingItems: Number,
    items: [itemSchema],
  },
  { _id: false }
);

const seqTopicSchema = new Schema<ISeqTopic>({
  topicId: { type: String, required: true, unique: true },
  course: { type: String, required: true, index: true },
  section: { type: String, required: true },
  topicNumber: { type: Number, required: true },
  order: { type: Number, required: true },
  title: { type: String, required: true },
  slug: { type: String, required: true },
  overview: { type: String, default: '' },
  liveCodingException: { type: Boolean, default: false },
  lessons: [lessonSchema],
  checkpoint: { type: itemSchema, required: false, default: null },
  sourceFile: { type: String, default: '' },
  importedAt: { type: Date, default: Date.now },
});

seqTopicSchema.index({ course: 1, order: 1 });

export const SeqTopic = model<ISeqTopic>('SeqTopic', seqTopicSchema, 'seqTopics');

// The minimal shape every gating function below actually needs — just the
// lessons/checkpoint, not a full Mongoose document. A real `ISeqTopic`
// satisfies this structurally with no change at any existing call site; it
// also lets a caller pass a filtered VIEW of a topic (e.g. with hidden
// practice-group items stripped out — see seq.controller.ts's `topicView()`)
// so the unlock math treats hidden content as if it doesn't exist at all,
// rather than as locked content blocking progress.
export interface SeqTopicItemView {
  lessons: SeqLesson[];
  checkpoint: SeqItem | null;
}

// Module 2 code review, algorithms/data structures finding: flattenItems was
// recomputed redundantly multiple times per request in several places —
// e.g. seqPracticeScope.service.ts's resolveTopicScope calls it 3 times on
// the SAME topic in one function, and pickDefaultOpenItem below calls it
// twice internally. Memoized here by object IDENTITY (a WeakMap keyed on
// the `topic`/view object itself), not by topicId, deliberately over the
// code review's other suggested option (precomputing an ordered item-id
// list at import time and storing it on the document): a stored precomputed
// list can silently go stale if `lessons`/`checkpoint` are ever mutated
// without re-running the precompute step, with nothing to catch it — a real
// correctness hazard this approach has no equivalent of. A request-scoped,
// identity-keyed cache is always trivially correct instead: every request
// builds a fresh Mongoose document (or topicView() plain object) from the
// DB, so there is nothing to invalidate, and it requires zero call-site
// changes anywhere (fully transparent). It also solves a subtler
// correctness hazard for free: topicView() in seq.controller.ts builds a
// DIFFERENT plain object per call when `includeGroups` is false (an admin's
// unstripped view vs. a learner's practice-group-stripped view of the same
// topicId, concurrently, in the same process) — a cache keyed by topicId
// alone would risk serving one caller's stripped result to another caller
// who should see the unstripped one. Keying by object identity means two
// different view objects for the same topicId simply get two different
// cache entries, with no extra bookkeeping. A WeakMap (not a Map) so a
// view object that goes out of scope after a request is garbage-collected
// normally, never leaking memory across requests.
const flattenCache = new WeakMap<SeqTopicItemView, { lessonId: string | null; item: SeqItem }[]>();

// Flatten a topic's items in strict play order: lesson 1's items, lesson 2's
// items, …, then the checkpoint if the topic has one. The single source of
// ordering for unlock math.
export function flattenItems(topic: SeqTopicItemView): { lessonId: string | null; item: SeqItem }[] {
  const cached = flattenCache.get(topic);
  if (cached) return cached;

  const flat: { lessonId: string | null; item: SeqItem }[] = [];
  for (const lesson of topic.lessons) {
    for (const item of lesson.items) flat.push({ lessonId: lesson.lessonId, item });
  }
  if (topic.checkpoint) flat.push({ lessonId: null, item: topic.checkpoint });

  flattenCache.set(topic, flat);
  return flat;
}

// A set of items (one lesson's, say) is "satisfied" once every one of its
// non-practice-group items is in `set`, and — if it has any practice-group
// items at all — at least one of *those* is too. A practice-group item is an
// optional pick-any-one-of-N bonus (e.g. a lesson's trailing debugging
// exercises): passing a single one is enough, the rest are never required.
export function itemsSatisfied(items: SeqItem[], set: Set<string>): boolean {
  const core = items.filter((i) => !i.practiceGroup);
  const group = items.filter((i) => i.practiceGroup);
  if (!core.every((i) => set.has(i.itemId))) return false;
  if (group.length > 0 && !group.some((i) => set.has(i.itemId))) return false;
  return true;
}

// Every lesson of `topic` is satisfied (see `itemsSatisfied`) and, if the
// topic has a checkpoint, it's in `set` too. A stub topic (no lessons) is
// never "done". Used for earned completion (pass set) and for skip (skip set)
// — a skip stamps every flattened item, including bonus ones, so it always
// satisfies this regardless of the practice-group logic.
export function topicItemsAllIn(topic: SeqTopicItemView, set: Set<string>): boolean {
  if (topic.lessons.length === 0) return false;
  if (!topic.lessons.every((l) => itemsSatisfied(l.items, set))) return false;
  return topic.checkpoint ? set.has(topic.checkpoint.itemId) : true;
}

// Which items are attemptable right now, walking lessons in file order. A
// lesson's core (non-practice-group) items unlock strictly one after another,
// exactly as before practice groups existed. Once every core item has passed,
// ALL of the lesson's practice-group items open simultaneously — not one at a
// time — since passing any single one satisfies the lesson. Once a lesson is
// satisfied the scan continues into the next lesson/checkpoint, but the
// lesson's still-open, still-unpassed practice-group items are never removed
// from the set: they stay attemptable indefinitely as ungated bonus practice.
export function computeOpenItemIds(topic: SeqTopicItemView, passed: Set<string>): Set<string> {
  const open = new Set<string>();
  for (const lesson of topic.lessons) {
    const core = lesson.items.filter((i) => !i.practiceGroup);
    const group = lesson.items.filter((i) => i.practiceGroup);

    const blockingCore = core.find((i) => !passed.has(i.itemId));
    if (blockingCore) {
      open.add(blockingCore.itemId);
      return open;
    }

    if (group.length > 0) {
      for (const item of group) open.add(item.itemId);
      if (!group.some((i) => passed.has(i.itemId))) return open;
    }
  }
  if (topic.checkpoint && !passed.has(topic.checkpoint.itemId)) {
    open.add(topic.checkpoint.itemId);
  }
  return open;
}

// A single "default" pick from an open set, for UI that wants to land
// somewhere specific (e.g. on page load, or the target of a "Next →"
// button) rather than present every open item as equally salient. Prefers
// the first item, in file order, that's open AND not yet passed — a
// practice-group item never leaves the open set once it's opened (even
// after being passed), so without this a learner who'd already finished
// some of the group would keep landing back on the first one in the list on
// every reload. Falls back to the first open item if everything open has
// already been passed (the learner cleared the whole group). When there is
// no practice-group anywhere in the topic this is always identical to what
// a plain linear "first unpassed item" scan would return.
export function pickDefaultOpenItem(topic: SeqTopicItemView, open: Set<string>, passed: Set<string>): string | null {
  for (const { item } of flattenItems(topic)) {
    if (open.has(item.itemId) && !passed.has(item.itemId)) return item.itemId;
  }
  for (const { item } of flattenItems(topic)) {
    if (open.has(item.itemId)) return item.itemId;
  }
  return null;
}
