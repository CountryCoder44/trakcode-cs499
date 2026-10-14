import { Schema, model, Document } from 'mongoose';

// "Sequential Curriculum" — the hand-authored, ordered pass/fail lesson package
// under `Sequential Curriculum/` at the repo root. Deliberately a SEPARATE model
// from `CurriculumItem` / Learn Mode: this represents the new structured format
// (topic -> lessons -> ordered items, each a concept check or a live-coding
// task, plus a topic-ending checkpoint), imported verbatim from the `.md`
// source of truth. See server/src/seeds/seqCurriculum.parse.ts.

export type SeqItemType = 'concept' | 'practical' | 'checkpoint';
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

  // shared
  tutor?: string;
  passRule?: string;

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
    type: { type: String, enum: ['concept', 'practical', 'checkpoint'], required: true },
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
    acceptPattern: String,
    acceptCommands: [String],
    hiddenTests: [hiddenTestSchema],

    tutor: String,
    passRule: String,

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

// Flatten a topic's items in strict play order: lesson 1's items, lesson 2's
// items, …, then the checkpoint if the topic has one. The single source of
// ordering for unlock math.
export function flattenItems(topic: ISeqTopic): { lessonId: string | null; item: SeqItem }[] {
  const flat: { lessonId: string | null; item: SeqItem }[] = [];
  for (const lesson of topic.lessons) {
    for (const item of lesson.items) flat.push({ lessonId: lesson.lessonId, item });
  }
  if (topic.checkpoint) flat.push({ lessonId: null, item: topic.checkpoint });
  return flat;
}

// Every item of `topic` has an entry in `set` (of item IDs). With a checkpoint
// this equals "the checkpoint's row is present"; without one, "every lesson item
// is present". A stub topic (no items) is never "done". Used for earned
// completion (pass set) and for skip (skip set).
export function topicItemsAllIn(topic: ISeqTopic, set: Set<string>): boolean {
  const flat = flattenItems(topic);
  return flat.length > 0 && flat.every(({ item }) => set.has(item.itemId));
}
