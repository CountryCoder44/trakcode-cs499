// Mirrors the server's response shapes (server/src/controllers/*). Kept
// hand-written rather than generated — the API surface is small and stable
// enough that a codegen step isn't worth the setup for this build.

export type Stack = 'python' | 'typescript' | 'cpp';
export type Difficulty = 'easy' | 'medium' | 'hard' | 'interview';
export type ProblemType = 'deep_dive' | 'flash_bug' | 'flash_fill';
export type ExecutionLanguage = 'python' | 'typescript' | 'cpp';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  subscriptionStatus: 'trial' | 'active' | 'past_due' | 'canceled' | 'demo';
  profile: {
    isPublic: boolean;
    slug?: string;
    showPortfolioLinks: boolean;
  };
  createdAt: string;
}

export interface CurriculumTreeItem {
  id: string;
  title: string;
  description: string;
  level: 'intro' | 'intermediate' | 'advanced';
  prerequisites: string[];
  order: number;
  status: 'not_started' | 'in_progress' | 'complete';
  locked: boolean;
}

export interface CurriculumItemDetail {
  id: string;
  stack: Stack;
  title: string;
  description: string;
  level: 'intro' | 'intermediate' | 'advanced';
  prerequisites: string[];
  lessonContent: string;
  order: number;
  topic: string;
}

// Where the learner currently stands on a lesson, per the Learn Mode
// redesign — phase is derived server-side from whether a problem is
// currently attached, not stored separately. See server/src/controllers/curriculum.controller.ts.
export interface LearnerState {
  status: 'not_started' | 'in_progress' | 'complete';
  unaidedPassCount: number;
  phase: 'calibrating' | 'practicing';
  currentProblem: Problem | null;
  hasPriorSession: boolean;
  resumeSessionId: string | null;
}

// Returned alongside a `pass` submission when it counts toward (or
// completes) a Learn Mode lesson — absent for a plain Practice Mode/Flash
// Card submission with no curriculum link.
export interface CurriculumAdvance {
  curriculumItemId: string;
  unaidedPassCount: number;
  lessonJustCompleted: boolean;
  resumeSessionId: string;
}

export interface ProgressEntry {
  curriculumItemId: string;
  status: 'not_started' | 'in_progress' | 'complete';
  completedAt: string | null;
}

export interface TestCase {
  input: string;
  expectedOutput: string;
}

export interface Problem {
  id: string;
  stack: Stack;
  topic: string;
  difficulty: Difficulty;
  type: ProblemType;
  prompt: string;
  starterCode: string;
  testCases: TestCase[];
  tags: string[];
}

export interface TestResult {
  passed: boolean;
  actualOutput: string;
  expectedOutput: string;
  timeMs?: number;
}

export interface SubmissionResult {
  id: string;
  problemId: string;
  result: 'pass' | 'fail' | 'error';
  testResults: TestResult[];
  executionTimeMs: number;
  compileError: string | null;
  stderr: string;
  submittedAt: string;
}

export interface SubmissionHistoryEntry {
  id: string;
  problem: { _id: string; topic: string; difficulty: Difficulty; type: ProblemType; stack: Stack } | null;
  language: ExecutionLanguage;
  result: 'pass' | 'fail' | 'error';
  executionTimeMs: number;
  pushedToGithub: boolean;
  githubRepoUrl: string | null;
  submittedAt: string;
}

export interface TutorMessage {
  role: 'user' | 'tutor';
  content: string;
  timestamp: string;
}

export interface TutorSession {
  id: string;
  contextType: 'problem' | 'curriculumItem';
  contextId: string;
  messages: TutorMessage[];
  createdAt: string;
}

export interface PortfolioEntry {
  submissionId: string;
  problem: { topic: string; difficulty: Difficulty; type: ProblemType; stack: Stack } | null;
  githubRepoUrl: string;
  language: ExecutionLanguage;
  submittedAt: string;
}

export interface HeatmapEntry {
  date: string;
  count: number;
}

export interface ActivitySummary {
  learningHeatmap: HeatmapEntry[];
  practiceHeatmap: HeatmapEntry[];
  streak: { currentStreak: number; longestStreak: number };
  totalLessonsCompleted: number;
  totalSubmissions: number;
}

export interface PublicProfile extends ActivitySummary {
  name: string;
  slug: string;
  portfolioLinks: { githubRepoUrl: string; submittedAt: string }[];
}

export interface RoadmapRequest {
  id: string;
  title: string;
  description: string;
  status: 'requested' | 'planned' | 'in_progress' | 'live';
  votes: number;
  votedByViewer: boolean;
  createdAt: string;
  liveAt: string | null;
}

export interface BillingStatus {
  subscriptionStatus: 'trial' | 'active' | 'past_due' | 'canceled' | 'demo';
  trialEndsAt: string | null;
  hasStripeCustomer: boolean;
  hasActiveSubscription: boolean;
}

export interface AdminPendingProblem {
  id: string;
  stack: Stack;
  topic: string;
  difficulty: Difficulty;
  type: ProblemType;
  prompt: string;
  tags: string[];
  createdAt: string;
}

export interface AdminProblemListItem {
  id: string;
  stack: Stack;
  topic: string;
  difficulty: Difficulty;
  type: ProblemType;
  prompt: string;
  validated: boolean;
  timesServed: number;
  tags: string[];
  createdAt: string;
  // Highest Sequential Curriculum topic number this problem was scoped to —
  // null when generated unscoped (no course for this stack, or predates topic
  // scoping). See seqPracticeScope.service.ts.
  requiredTopicNumber: number | null;
}

export interface AdminUserListItem {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  subscriptionStatus: 'trial' | 'active' | 'past_due' | 'canceled' | 'demo';
  createdAt: string;
  submissionCount: number;
  tutorSessionCount: number;
  completedLessonCount: number;
}

// ---- Sequential Curriculum ("Learn by topic") ----
// Mirrors server/src/controllers/seq.controller.ts. Independent of the Learn
// Mode (`Curriculum*`) types above — different feature, string item IDs.

export type SeqItemType = 'concept' | 'practical' | 'checkpoint' | 'reading';
export type SeqEvaluator = 'mc' | 'browser-exec' | 'hidden-tests' | 'local-verify' | 'branch-select';
export type SeqTopicStatus = 'available' | 'in_progress' | 'complete';

export interface SeqTopicSummary {
  topicId: string;
  topicNumber: number;
  section: string;
  title: string;
  slug: string;
  liveCodingException: boolean;
  lessonCount: number;
  totalItems: number;
  completedItems: number;
  status: SeqTopicStatus;
  skipped: boolean;
}

export interface SeqOption {
  letter: string;
  text: string;
}

// Lesson-narration clip. `src` and `timings` are API-origin-relative paths
// (e.g. "/seq-audio/py-4.1-01.read.mp3"). Present only after the narration
// pipeline has generated audio — see Sequential Curriculum/AUDIO.md.
export interface SeqAudioClip {
  src: string;
  timings: string;
  durationSec: number;
}
// One run of a sentence's display text — plain prose or the verbatim content
// of one `inline code` span, in order. Lets the read-along highlight exactly
// the spans the author marked as code. Absent on clips generated before this
// existed — the read-along falls back to its old whole-word heuristic then.
export interface SeqDisplaySegment {
  text: string;
  code: boolean;
}
export interface SeqSentenceTiming {
  text: string;
  start: number;
  end: number;
  segments?: SeqDisplaySegment[];
}
export interface SeqAudioTimings {
  segmentId: string;
  durationSec: number;
  sentences: SeqSentenceTiming[];
}

// Rationale / tutor notes / expected output are never sent to the client — the
// server grades and returns feedback in the submit response. `answer` and
// `solution` are the exception: sent ONLY to an admin (see publicItem), for the
// admin-tools answer-key button.
export interface SeqPublicItem {
  itemId: string;
  type: SeqItemType;
  title: string;
  passed: boolean;
  read?: string;
  check?: string;
  checkCode?: string;
  options?: SeqOption[];
  do?: string;
  brief?: string;
  requirements?: string[];
  starterCode?: string;
  code?: string;
  evaluator?: SeqEvaluator;
  passRule?: string;
  // Belongs to this lesson's pick-any-one-of-N optional bonus pool — passing
  // any single item so flagged satisfies the lesson; the rest stay open
  // afterward as ungated bonus practice.
  practiceGroup?: boolean;
  // Only ever present on a `practiceGroup` item — its exact target stdout,
  // shown to the learner so a debugging exercise states what to aim for.
  expectExactOutput?: string;
  // Only ever present on a `checkpoint` — one worked input/output example
  // pulled from its (varied, still-hidden) hidden-tests set, so the learner
  // sees a concrete picture of the expected shape before starting.
  exampleTest?: { input: string; output: string };
  answer?: string; // admin only — correct MC option letter(s)
  solution?: string; // admin only — a correct reference solution for a code item
  audio?: {
    read?: SeqAudioClip;
    do?: SeqAudioClip;
    brief?: SeqAudioClip;
    question?: SeqAudioClip; // concept question stem
    options?: Record<string, SeqAudioClip>; // one clip per answer choice, keyed by letter
    requirements?: Record<string, SeqAudioClip>; // one clip per requirement bullet, keyed by its index
  };
}

export interface SeqLesson {
  lessonId: string;
  number: string;
  title: string;
  objective: string | null;
  estimatedTime: string | null;
  itemCount: number;
  liveCodingItems: number | null;
  items: SeqPublicItem[];
}

export interface SeqTopicDetail {
  topic: {
    topicId: string;
    topicNumber: number;
    section: string;
    title: string;
    slug: string;
    overview: string;
    liveCodingException: boolean;
  };
  lessons: SeqLesson[];
  checkpoint: SeqPublicItem | null; // concept-only topics have none
  progress: {
    completedItemIds: string[];
    currentItemId: string | null;
    // Every item attemptable right now — usually just `currentItemId`, but a
    // whole practice group opens at once (see `SeqPublicItem.practiceGroup`).
    openItemIds: string[];
    topicComplete: boolean;
    skipped: boolean;
  };
}

export interface SeqTestOutcome {
  label: string;
  input?: string;
  expected: string;
  actual: string;
  passed: boolean;
}

export interface SeqSubmitResult {
  passed: boolean;
  preview: boolean;
  rationale: string | null;
  ifIncorrect: string | null;
  message: string | null;
  tests: SeqTestOutcome[] | null;
  stderr: string | null;
  compileError: string | null;
  hint: string | null; // "almost — only capitalization differs" on a near miss
  nextItemId: string | null;
  openItemIds: string[];
  lessonJustCompleted: string | null;
  topicComplete: boolean;
}
