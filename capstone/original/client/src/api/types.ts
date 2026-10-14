// Mirrors the server's response shapes (server/src/controllers/*). Kept
// hand-written rather than generated — the API surface is small and stable
// enough that a codegen step isn't worth the setup for this build.

export type Stack = 'python' | 'mern' | 'cpp';
export type Difficulty = 'easy' | 'medium' | 'hard' | 'interview';
export type ProblemType = 'deep_dive' | 'flash_bug' | 'flash_fill';
export type ExecutionLanguage = 'python' | 'javascript' | 'cpp';

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

// Mirrors server/src/models/AiUsageLog.ts's purpose enum.
export type AiUsagePurpose = 'tutor-reply' | 'tutor-guardrail' | 'tutor-readiness' | 'tutor-memory-extraction' | 'problem-generation';
export type AiModelTier = 'reasoning' | 'fast';

interface AdminUsageTokens {
  callCount: number;
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
  estimatedCostUsd: number;
}

export interface AdminUsageSummaryRow extends AdminUsageTokens {
  purpose: AiUsagePurpose;
  tier: AiModelTier;
  modelId: string;
}

export type AdminUsageTotals = AdminUsageTokens;

export interface AdminUserUsage extends AdminUsageTokens {
  userId: string | null;
  email: string;
  name: string;
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
