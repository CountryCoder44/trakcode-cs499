// Mirrors the server's response shapes (server/src/controllers/*). Kept
// hand-written rather than generated — the API surface is small and stable
// enough that a codegen step isn't worth the setup for this build.

export type Stack = 'python' | 'typescript' | 'cpp' | 'java';
export type Difficulty = 'easy' | 'medium' | 'hard' | 'interview';
export type ProblemType = 'deep_dive' | 'flash_bug' | 'flash_fill';
export type ExecutionLanguage = 'python' | 'typescript' | 'cpp' | 'java';

// 'none' = signed up but no subscription or trial started yet.
export type SubscriptionStatus = 'none' | 'trial' | 'active' | 'past_due' | 'canceled' | 'demo';

export type OAuthProvider = 'google' | 'github' | 'linkedin';

export interface AuthProviderInfo {
  id: OAuthProvider;
  label: string;
}

export interface UserIdentity {
  provider: OAuthProvider;
  email: string | null;
  linkedAt: string;
}

export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  role: 'user' | 'admin';
  subscriptionStatus: SubscriptionStatus;
  // Whether Learn, Practice and Trak are open to this account right now.
  hasAccess: boolean;
  profile: {
    isPublic: boolean;
    slug?: string;
    showPortfolioLinks: boolean;
    searchIndexable?: boolean;
  };
  createdAt: string;
  identities: UserIdentity[];
  hasPassword: boolean;
  githubPortfolioConnected: boolean;
  linkedinSharingConnected: boolean; // can post milestones (token present and not expired)
  linkedinSharingExpiresAt: string | null;
  dismissedPrompts: string[];
  // Set when "Delete my account" is waiting for the end of a paid period.
  deletionScheduledFor: string | null;
  // Banned after a safety review; null when in good standing.
  standing: AccountStanding;
  // A misuse warning to show once, until acknowledged.
  warning: { issuedAt: string; flaggedAt: string; reason: string } | null;
}

export interface AccountHistoryItem {
  id: string;
  createdAt: string;
  severity: SafetySeverity;
  categories: SafetyCategory[];
  status: IncidentStatus;
  action: 'none' | 'warned' | 'banned';
  reviewedAt: string | null;
  reviewerNotes: string | null;
  reportedTo: string | null;
  message: string;
}

export type AccountStanding = { state: 'banned'; reason?: string } | null;

export type SafetyCategory = 'jailbreak' | 'harassment' | 'sexual-minors' | 'violent-threat' | 'self-harm' | 'illegal-other';
export type SafetySeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'open' | 'dismissed' | 'reviewed';

export interface SafetyIncident {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  contextType: string;
  contextId: string;
  message: string;
  recentContext: { role: string; content: string }[];
  categories: SafetyCategory[];
  severity: SafetySeverity;
  rationale: string;
  blocked: boolean;
  ip?: string;
  status: IncidentStatus;
  action: 'none' | 'warned' | 'banned';
  reviewerNotes?: string;
  reviewedAt?: string;
  reportedTo?: string;
  reportedAt?: string;
  reportReference?: string;
  legalHold?: boolean;
  createdAt: string;
  accountDeleted: boolean;
  standing: AccountStanding;
  incidentsForUser: number;
}

export type SafetyView = 'open' | 'actioned' | 'closed';

export interface SafetyIncidentList {
  page: number;
  pageSize: number;
  total: number;
  /** Open flags at medium or above (the To review count). */
  openCount: number;
  actionedCount: number;
  closedCount: number;
  items: SafetyIncident[];
}

export interface UserIpReport {
  ips: { ip: string; events: string[]; count: number; firstSeenAt: string; lastSeenAt: string }[];
  sharedWith: { userId: string; ip: string; email: string }[];
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
  contextType: 'problem' | 'seqItem' | 'practiceAttempt';
  contextId: string;
  messages: TutorMessage[];
  createdAt: string;
}

export interface PortfolioEntry {
  submissionId: string;
  problem: { topic: string; difficulty: Difficulty; type: ProblemType; stack: Stack } | null;
  githubRepoUrl: string;
  title: string | null;
  language: ExecutionLanguage;
  submittedAt: string;
}

export type PushDestination = 'default' | 'new';

export interface PushResult {
  githubRepoUrl: string; // the pushed folder, or the new repo
  repoName: string;
  repoUrl: string;
  commitUrl: string;
  defaultRepoName: string;
}

export interface HeatmapEntry {
  date: string;
  count: number;
  items: string[];
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
}

export interface ActivitySummary {
  learningHeatmap: HeatmapEntry[];
  practiceHeatmap: HeatmapEntry[];
  learningStreak: StreakInfo;
  practiceStreak: StreakInfo;
  totalLessonsCompleted: number;
  totalSubmissions: number;
}

export interface PublicProfile extends ActivitySummary {
  name: string;
  slug: string;
  portfolioLinks: { githubRepoUrl: string; submittedAt: string }[];
  /** The learner opted in to search engines listing this profile. */
  searchIndexable: boolean;
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
  subscriptionStatus: SubscriptionStatus;
  hasAccess: boolean;
  hasSubscription: boolean;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialAvailable: boolean;
  /** A trial was refused because the card had already had one. */
  trialDeniedReason?: 'card-reused' | null;
  trialDays: number;
  foundingMember: boolean;
  founderWindowOpen: boolean;
  founderWindowEndsAt: string | null;
  price: { productName: string; amountCents: number; currency: string; founderPercentOff: number | null } | null;
  billingConfigured: boolean;
  /** Tutoring packs on sale (extra Trak questions, one-time payment). */
  trakPacks?: TrakPack[];
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
export type AiUsagePurpose = 'tutor-reply' | 'tutor-guardrail' | 'tutor-memory-extraction' | 'problem-generation' | 'practice-generation';
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
  subscriptionStatus: SubscriptionStatus;
  emailVerified: boolean;
  foundingMember: boolean;
  deletionScheduledFor: string | null;
  signInMethods: string[];
  createdAt: string;
  submissionCount: number;
  tutorSessionCount: number;
  itemsPassedCount: number;
}

export interface AdminUserQuery {
  page?: number;
  q?: string;
  role?: 'user' | 'admin';
  status?: SubscriptionStatus;
  sort?: 'newest' | 'oldest' | 'email' | 'name';
}

export interface AdminUserList {
  users: AdminUserListItem[];
  page: number;
  limit: number;
  total: number;
  counts: { byStatus: Partial<Record<SubscriptionStatus, number>>; foundingMembers: number };
}

export interface AdminFoundingMember {
  email: string;
  foundingSince: string;
  sourceProduct: string;
  hasAccount: boolean;
  accountEmail: string | null;
  subscriptionStatus: SubscriptionStatus | null;
  trialUsed: boolean;
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
  rationale?: string; // admin only (Learn edit mode)
  ifIncorrect?: string; // admin only (Learn edit mode)
  optionsInOrder?: SeqOption[]; // admin only: choices in authored A-D order
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

export interface AdminAssignmentItem {
  id: string;
  /** false: a practice-library brief nobody has started, so it isn't generated yet. */
  built: boolean;
  title: string;
  language: PracticeLanguage;
  mode: 'basics' | 'stretch';
  scope: 'small' | 'medium' | 'large';
  status: 'published' | 'quarantined' | 'disabled' | 'unbuilt';
  source: 'generated' | 'legacy' | 'library';
  libraryId: string | null;
  concepts: { id: string; name: string }[];
  scenario: string;
  goal: string;
  requirements: string[];
  tests: { visible: number; hidden: number };
  timesAssigned: number;
  attempts: { inProgress: number; completed: number; abandoned: number };
  createdAt: string | null;
}

export interface AdminAssignmentQuery {
  language?: PracticeLanguage;
  mode?: 'basics' | 'stretch';
  scope?: 'small' | 'medium' | 'large';
  status?: 'published' | 'quarantined' | 'disabled' | 'unbuilt';
  source?: 'generated' | 'legacy' | 'library';
  q?: string;
  sort?: 'newest' | 'oldest' | 'mostAssigned' | 'leastAssigned' | 'title' | 'language';
  page?: number;
}

export interface AdminAssignmentList {
  page: number;
  pageSize: number;
  total: number;
  byLanguage: Partial<Record<PracticeLanguage, number>>;
  items: AdminAssignmentItem[];
}

export type GrowthRange = 'week' | 'month' | '6months' | 'year';

export interface GrowthTally {
  trialStarts: number;
  conversions: number;
  trialLosses: number;
  refusedTrials: number;
  newPaid: number;
  paidCancels: number;
}

export interface GrowthPoint extends GrowthTally {
  start: string;
  end: string;
  paying: number;
  trials: number;
}

export interface GrowthReport {
  range: GrowthRange;
  now: { paying: number; trials: number; freeAccess: number; ended: number; neverSubscribed: number };
  last30: GrowthTally & { churn: number | null; conversion: number | null };
  allTime: GrowthTally & { conversion: number | null };
  goal: {
    target: number;
    launch: string;
    deadline: string;
    monthsLeft: number;
    progress: number;
    churnUsed: number;
    churnIsAssumed: boolean;
    conversionUsed: number;
    conversionIsAssumed: boolean;
    neededPerMonth: number | null;
    trialsNeededPerMonth: number | null;
    onPace: boolean | null;
  };
  series: GrowthPoint[];
}

export type AccountDeletionState =
  | { kind: 'admin' }
  /** Set to renew: deleting also cancels it (a trial ends now, paid time runs out first). */
  | { kind: 'renewing'; renewsOn: string | null; trial: boolean }
  | { kind: 'at-period-end'; deleteOn: string }
  | { kind: 'scheduled'; deleteOn: string }
  | { kind: 'immediate' };

// ---- Allowances (server/src/services/usageLimits.service.ts) ----
export type LimitPlan = 'unlimited' | 'member' | 'trial' | 'none';

export interface Allowance {
  limit: number;
  used: number;
  remaining: number;
  period: 'week' | 'day' | 'month' | 'trial';
  /** ISO time it refills; null for the trial's one-off practice allowance. */
  resetsAt: string | null;
}

export interface FairUse {
  /** Share of this month's combined AI fair-use limit used (0-100). */
  percentUsed: number;
  resetsAt: string;
}

export interface UsageSummary {
  plan: LimitPlan;
  /** null = unlimited (admins). */
  trak: Allowance | null;
  practice: Allowance | null;
  /** Bought Trak questions left (tutoring packs), used once `trak` runs out. */
  bonusTrak: number;
  /** The monthly fair-use limit across Trak and new practice questions; null = none. */
  fairUse: FairUse | null;
}

export interface TrakPack {
  id: string;
  questions: number;
  priceCents: number;
}

// ---- Practice Mode: long-form assignments (Practice the basics / Stretch out) ----
export type PracticeLanguage = 'python' | 'typescript' | 'cpp' | 'java';
export type PracticeMode = 'basics' | 'stretch';
export type PracticeScope = 'small' | 'medium' | 'large';

export interface PracticeCatalog {
  languages: { id: PracticeLanguage; label: string }[];
  language: PracticeLanguage;
  scopes: { id: PracticeScope; label: string; description: string; needs: string[] }[];
  maxConcepts: number;
  hasTrackedProgress: boolean;
  foundation: { id: string; name: string; description: string; covered: boolean; checked: boolean }[];
  concepts: { id: string; name: string; description: string; requiresFoundation: string[]; requiresConcepts: string[]; incompatibleWith: string[] }[];
}

export interface PracticeFile {
  path: string;
  content: string;
}

export interface PracticeAssignmentView {
  id: string;
  contentVersion: number;
  language: PracticeLanguage;
  mode: PracticeMode;
  scope: PracticeScope;
  scopeLabel: string;
  title: string;
  scenario: string;
  goal: string;
  requirements: string[];
  deliverables: string[];
  inputSpec: string;
  outputSpec: string;
  constraints: string[];
  acceptanceCriteria: string[];
  samples: string;
  starterCode: string;
  fixtures: PracticeFile[];
  visibleTests: { name: string; input: string; expectedOutput: string; expectedFiles: PracticeFile[] }[];
  hiddenTestCount: number;
  rubric: { id: string; kind: 'test' | 'concept' | 'review'; description: string; conceptId?: string }[];
  concepts: { id: string; name: string }[];
  foundation: { id: string; name: string }[];
}

export interface PracticeRunTest {
  name: string;
  visible: boolean;
  passed: boolean;
  input?: string;
  expectedOutput?: string;
  actualOutput?: string;
  fileChecks?: { path: string; passed: boolean }[];
}

export interface PracticeRun {
  ranAt: string;
  allTestsPassed: boolean;
  passedCount: number;
  totalCount: number;
  compileError: string | null;
  stderr: string;
  tests: PracticeRunTest[];
  evidence: { conceptId: string; label: string; passed: boolean }[];
  completedThisRun: boolean;
}

export interface PracticeAttemptView {
  id: string;
  assignmentId: string;
  language: PracticeLanguage;
  mode: PracticeMode;
  scope: PracticeScope;
  concepts: { id: string; name: string }[];
  status: 'in_progress' | 'completed' | 'abandoned';
  replay: boolean;
  code: string;
  lastRun: PracticeRun | null;
  runCount: number;
  tutorSessionId: string | null;
  github: { url: string; commitUrl: string; repoName: string } | null;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface PracticeAttemptSummary {
  id: string;
  title: string;
  language: PracticeLanguage;
  mode: PracticeMode;
  scope: PracticeScope;
  concepts: { id: string; name: string }[];
  status: 'in_progress' | 'completed' | 'abandoned';
  replay: boolean;
  passedCount: number | null;
  totalCount: number | null;
  updatedAt: string;
}

export interface PracticeStartRequest {
  requestId: string;
  intent?: 'auto' | 'new';
  language: PracticeLanguage;
  mode: PracticeMode;
  scope: PracticeScope;
  conceptCount?: number;
  conceptIds?: string[];
  conceptText?: string;
  foundationIds?: string[];
}

export interface PracticeConflict {
  code: string;
  message: string;
  suggestions: { label: string; patch: Partial<Pick<PracticeStartRequest, 'scope' | 'conceptCount' | 'conceptIds' | 'foundationIds'>> }[];
}

export type PracticeStartResult =
  | { status: 'ready'; attempt: PracticeAttemptView; assignment: PracticeAssignmentView }
  | { status: 'pending'; jobId: string }
  | { status: 'conflict'; conflict: PracticeConflict }
  | { status: 'previously_started'; abandonedAttemptId: string; assignment: { id: string; title: string; scenario: string } }
  | { status: 'active_exists'; attempt: PracticeAttemptSummary }
  | { status: 'failed'; message: string }
  | { status: 'unavailable'; message: string };

// ---- Practice library (server/src/practice/library) ----
export type PracticeLibraryStatus = 'not_started' | 'in_progress' | 'completed' | 'abandoned';

export interface PracticeLibraryItem {
  id: string;
  title: string;
  mode: PracticeMode;
  scope: PracticeScope;
  concepts: { id: string; name: string }[];
  scenario: string;
  requirements: string[];
  /** Already built: starting it is instant and free. */
  ready: boolean;
  status: PracticeLibraryStatus;
}

// ---- Feedback + Messages ----
export type FeedbackAuthor = 'user' | 'system' | 'team';

export interface FeedbackMessage {
  from: FeedbackAuthor;
  body: string;
  createdAt: string;
}

export type FeedbackKind = 'bug' | 'idea';

export interface FeedbackThreadSummary {
  id: string;
  kind: FeedbackKind;
  subject: string;
  preview: string;
  status: 'open' | 'closed';
  unread: number;
  hasScreenshot: boolean;
  lastMessageAt: string;
  createdAt: string;
}

export interface FeedbackThreadDetail extends FeedbackThreadSummary {
  pagePath: string;
  messages: FeedbackMessage[];
}

export interface AdminFeedbackRow extends FeedbackThreadSummary {
  userId: string;
  userEmail: string;
  userName: string;
  unreadForTeam: boolean;
  firstMessage: string;
  replies: number;
}

export interface AdminFeedbackDetail extends FeedbackThreadDetail {
  userId: string;
  userEmail: string;
  userName: string;
  userAgent: string;
  viewport: string;
  unreadForTeam: boolean;
}

// ---- Admin: a learner's tutoring packs ----
export interface AdminUserPack {
  id: string;
  packId: string;
  questions: number;
  used: number;
  remaining: number;
  amountCents: number;
  boughtAt: string;
  stripeSessionId: string;
  unused: boolean;
  withinRefundWindow: boolean;
  refundWindowEndsAt: string;
  refundEligible: boolean;
  forfeited: boolean;
}
