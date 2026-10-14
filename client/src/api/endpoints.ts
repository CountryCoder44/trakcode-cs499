import { api, apiUrl } from './client';
import type {
  AdminUserPack,
  AdminFeedbackDetail,
  AdminFeedbackRow,
  FeedbackThreadDetail,
  FeedbackThreadSummary,
  AccountDeletionState,
  PracticeLanguage,
  PracticeCatalog,
  PracticeStartRequest,
  PracticeStartResult,
  PracticeAttemptSummary,
  PracticeAttemptView,
  PracticeAssignmentView,
  PracticeLibraryItem,
  User,
  OAuthProvider,
  AuthProviderInfo,
  Stack,
  ProblemType,
  ExecutionLanguage,
  Problem,
  SubmissionResult,
  SubmissionHistoryEntry,
  TutorSession,
  PortfolioEntry,
  PushDestination,
  PushResult,
  ActivitySummary,
  PublicProfile,
  RoadmapRequest,
  BillingStatus,
  AdminPendingProblem,
  AdminUsageSummaryRow,
  AdminUsageTotals,
  AdminUserUsage,
  AdminProblemListItem,
  AdminUserList,
  AdminUserQuery,
  AdminFoundingMember,
  UsageSummary,
  SeqTopicSummary,
  SeqTopicDetail,
  SeqSubmitResult,
  AccountHistoryItem,
  AdminAssignmentList,
  AdminAssignmentQuery,
  GrowthRange,
  GrowthReport,
  AccountStanding,
  SafetyView,
  SafetyIncident,
  SafetyIncidentList,
  SafetySeverity,
  UserIpReport,
} from './types';

// ---- Auth ----
export const authApi = {
  signup: (body: { email: string; password: string; name: string }) =>
    api.post<{ token: string; user: User }>('/auth/signup', body, false),
  login: (body: { email: string; password: string }) =>
    api.post<{ token: string; user: User }>('/auth/login', body, false),
  me: () => api.get<{ user: User }>('/auth/me'),
  forgotPassword: (email: string) => api.post<{ message: string }>('/auth/password/forgot', { email }, false),
  resetPassword: (body: { token: string; password: string }) =>
    api.post<{ token: string; user: User }>('/auth/password/reset', body, false),

  // Social sign-in. `oauthStartUrl` is a full-page navigation, not a fetch.
  providers: () => api.get<{ providers: AuthProviderInfo[] }>('/auth/providers', false),
  oauthStartUrl: (provider: OAuthProvider) => apiUrl(`/auth/oauth/${provider}/start`),
  // Signed-in connect: returns a single-use start URL to navigate to.
  linkProvider: (provider: OAuthProvider, body: { returnTo?: string } = {}) =>
    api.post<{ url: string }>(`/auth/oauth/${provider}/link`, body),
  unlinkProvider: (provider: OAuthProvider) => api.del<{ user: User }>(`/auth/identities/${provider}`),
};

// ---- Sequential Curriculum ("Learn by topic") ----
export const seqApi = {
  listTopics: (course = 'python_beginner') =>
    api.get<{ course: string; topics: SeqTopicSummary[] }>(`/seq/topics?course=${course}`),
  // previewAsLearner: admin-only — compute gating as a non-admin would too,
  // not just hide items client-side (SeqTopicPage's "Hide debugging
  // exercises" toggle). Must be passed identically to `submit` below for the
  // same session, or the two calls disagree about what's open.
  getTopic: (topicId: string, opts?: { previewAsLearner?: boolean }) =>
    api.get<SeqTopicDetail>(`/seq/topics/${topicId}${opts?.previewAsLearner ? '?previewAsLearner=true' : ''}`),
  submit: (
    topicId: string,
    itemId: string,
    body: { kind: 'choice' | 'code' | 'text' | 'ack'; value: string; preview?: boolean; previewAsLearner?: boolean }
  ) => api.post<SeqSubmitResult>(`/seq/topics/${topicId}/items/${itemId}/submit`, body),
  skipTopic: (topicId: string) =>
    api.post<{ ok: boolean; topicId: string; itemsMarked: number }>(`/seq/topics/${topicId}/skip`),
  resetTopic: (topicId: string) => api.post<{ ok: boolean; topicId: string }>(`/seq/topics/${topicId}/reset`),
};

// ---- Practice Mode ----
export const practiceAssignmentsApi = {
  catalog: (language: PracticeLanguage) => api.get<PracticeCatalog>(`/practice/catalog?language=${language}`),
  start: (body: PracticeStartRequest) => api.post<PracticeStartResult>('/practice/assignments/start', body),
  job: (jobId: string) => api.get<PracticeStartResult>(`/practice/jobs/${jobId}`),
  library: (language: PracticeLanguage) =>
    api.get<{ items: PracticeLibraryItem[]; ownUnfinished: PracticeAttemptSummary[] }>(`/practice/library?language=${language}`),
  startLibrary: (id: string, requestId: string) =>
    api.post<PracticeStartResult>(`/practice/library/${id}/start`, { requestId }),
  attempts: (status = 'in_progress,abandoned') => api.get<{ attempts: PracticeAttemptSummary[] }>(`/practice/attempts?status=${status}`),
  attempt: (id: string) => api.get<{ attempt: PracticeAttemptView; assignment: PracticeAssignmentView }>(`/practice/attempts/${id}`),
  saveCode: (id: string, code: string) => api.put<{ savedAt: string }>(`/practice/attempts/${id}/code`, { code }),
  run: (id: string, code: string) => api.post<{ attempt: PracticeAttemptView }>(`/practice/attempts/${id}/run`, { code }),
  abandon: (id: string) => api.post<{ attempt: PracticeAttemptView }>(`/practice/attempts/${id}/abandon`, {}),
  reopen: (id: string) => api.post<{ attempt: PracticeAttemptView }>(`/practice/attempts/${id}/reopen`, {}),
  restart: (id: string) => api.post<{ attempt: PracticeAttemptView }>(`/practice/attempts/${id}/restart`, {}),
  replay: (id: string) => api.post<{ attempt: PracticeAttemptView }>(`/practice/attempts/${id}/replay`, {}),
  pushToGithub: (id: string, body: { title: string; destination: PushDestination; newRepoName?: string }) =>
    api.post<PushResult>(`/practice/attempts/${id}/github`, body),
};

export const practiceApi = {
  // `topicNumbers`: the Sequential Curriculum topics selected in the picker
  // (python/typescript — a learner's own completed topics by default, plus any
  // they explicitly "activated" ahead of their progress). `topic`: freeform
  // text, used only for a stack with no Sequential Curriculum course (cpp) —
  // unscoped, same as before topic scoping existed. Difficulty is no longer a
  // client choice — see DEFAULT_PRACTICE_DIFFICULTY server-side.
  requestDeepDive: (body: { stack: Stack; topic?: string; topicNumbers?: number[] }) =>
    api.post<{ problem: Problem }>('/practice/deep-dive/request', body),
  requestFlashCard: (body: { stack: Stack; type: Extract<ProblemType, 'flash_bug' | 'flash_fill'> }) =>
    api.post<{ problem: Problem }>('/practice/flash-card/request', body),
  getProblem: (id: string) => api.get<{ problem: Problem }>(`/practice/problem/${id}`),
  submit: (body: { problemId: string; code: string; language: ExecutionLanguage }) =>
    api.post<{ submission: SubmissionResult }>('/practice/submit', body),
  history: () => api.get<{ submissions: SubmissionHistoryEntry[] }>('/practice/history'),
};

// ---- Tutor ----
export const tutorApi = {
  sendMessage: (body: {
    sessionId?: string;
    contextType: 'problem' | 'seqItem' | 'practiceAttempt';
    contextId: string;
    // Optional because a session's opening turn (`initiate: true`) has no
    // learner message yet — Trak speaks first.
    message?: string;
    initiate?: boolean;
    // The learner's current, unsaved editor buffer — lets Trak see what's
    // actually on screen, not just their last graded submission.
    code?: string;
  }) =>
    api.post<{ sessionId: string; reply: string; usage?: UsageSummary }>(
      '/tutor/message',
      body
    ),
  getSession: (id: string) => api.get<{ session: TutorSession }>(`/tutor/session/${id}`),
  // Ask Trak is one continuous thread per learner — at most one exists.
  // `session: null` means no Ask Trak conversation has started yet.
  getLatestSeqItemSession: () => api.get<{ session: TutorSession | null }>('/tutor/seq-item/session'),
};

// ---- Portfolio ----
export const portfolioApi = {
  push: (body: { submissionId: string; title: string; destination: PushDestination; newRepoName?: string }) =>
    api.post<PushResult>('/portfolio/push', body),
  list: () => api.get<{ portfolio: PortfolioEntry[] }>('/portfolio'),
};

// ---- Profile ----
export const profileApi = {
  getPublic: (slug: string) => api.get<PublicProfile>(`/profile/${slug}`, false),
  updateSettings: (body: {
    name?: string;
    isPublic?: boolean;
    slug?: string;
    showPortfolioLinks?: boolean;
    searchIndexable?: boolean;
  }) =>
    api.put<{ name: string; profile: User['profile'] }>('/profile/settings', body),
  myActivity: () => api.get<ActivitySummary>('/profile/me/activity'),
  usage: () => api.get<{ usage: UsageSummary }>('/profile/usage'),
  acknowledgeWarning: () => api.post<{ ok: true }>('/profile/warning/ack'),
  dismissPrompt: (key: 'connect-accounts') => api.post<{ dismissed: string }>(`/profile/prompts/${key}/dismiss`),
  accountDeletion: () => api.get<{ state: AccountDeletionState }>('/profile/account/deletion'),
  deleteAccount: (confirmEmail: string) =>
    api.post<{ deleted: true } | { scheduledFor: string }>('/profile/account/delete', { confirmEmail }),
  keepAccount: () => api.post<{ kept: true }>('/profile/account/delete/cancel', {}),
};

// ---- Skill Roadmap ----
export const roadmapApi = {
  list: () => api.get<{ requests: RoadmapRequest[] }>('/roadmap', true),
  request: (body: { title: string; description?: string }) =>
    api.post<{ request: RoadmapRequest }>('/roadmap/request', body),
  vote: (id: string) => api.post<{ id: string; votes: number; votedByViewer: boolean }>(`/roadmap/${id}/vote`),
};

// ---- Billing ----
export const billingApi = {
  status: () => api.get<BillingStatus>('/billing/status'),
  founding: () => api.get<{ open: boolean; endsAt: string | null; lastDay: string | null }>('/billing/founding'),
  checkout: (acceptTerms: boolean) => api.post<{ url: string }>('/billing/checkout-session', { acceptTerms }),
  // Stripe's hosted page: change card, cancel, invoices.
  portal: () => api.post<{ url: string }>('/billing/portal-session'),
  // Skip the rest of the free trial: bills the first month now, full allowances now.
  startMembership: () => api.post<{ subscriptionStatus: string }>('/billing/start-membership'),
  // Capstone build: start the free trial without Stripe (paywall bypass).
  bypassTrial: () => api.post<{ subscriptionStatus: string; trialEndsAt: string }>('/billing/bypass-trial'),
  // Tutoring pack: extra Trak questions, paid immediately in Stripe Checkout.
  buyTrakPack: (packId: string) => api.post<{ url: string }>('/billing/trak-pack', { packId }),
};

// ---- Feedback + Messages ----
export const feedbackApi = {
  send: (body: { kind: 'bug' | 'idea'; message: string; screenshot?: string; pagePath: string; viewport: string }) =>
    api.post<{ thread: FeedbackThreadDetail }>('/feedback', body),
  threads: () => api.get<{ threads: FeedbackThreadSummary[] }>('/feedback/threads'),
  thread: (id: string) => api.get<{ thread: FeedbackThreadDetail }>(`/feedback/threads/${id}`),
  unread: () => api.get<{ unread: number }>('/feedback/unread'),
};

// ---- Admin ----
export const adminApi = {
  feedback: (status: 'open' | 'closed' | 'all', kind: 'bug' | 'idea' | 'all', page = 1) =>
    api.get<{
      threads: AdminFeedbackRow[];
      total: number;
      page: number;
      pageSize: number;
      openCount: number;
      unreadCount: number;
    }>(`/admin/feedback?status=${status}&kind=${kind}&page=${page}`),
  userPacks: (userId: string) =>
    api.get<{ email: string | null; balance: number; packs: AdminUserPack[] }>(`/admin/users/${userId}/packs`),
  feedbackThread: (id: string) => api.get<{ thread: AdminFeedbackDetail }>(`/admin/feedback/${id}`),
  replyFeedback: (id: string, body: string) =>
    api.post<{ thread: AdminFeedbackDetail }>(`/admin/feedback/${id}/reply`, { body }),
  setFeedbackStatus: (id: string, status: 'open' | 'closed') =>
    api.post<{ thread: AdminFeedbackDetail }>(`/admin/feedback/${id}/status`, { status }),
  pendingReview: () => api.get<{ problems: AdminPendingProblem[] }>('/admin/problems/pending-review'),
  updateRoadmapStatus: (id: string, status: RoadmapRequest['status']) =>
    api.put<{ request: RoadmapRequest }>(`/admin/roadmap/${id}/status`, { status }),
  // `since` (exact ISO cutoff, e.g. local midnight for a "Today" view) and
  // `days` (rolling window) are mutually exclusive at the call site — see
  // AdminPage.tsx's UsageRange, which only ever sets one.
  usageSummary: (range: { days?: number; since?: string }) => {
    const params = new URLSearchParams();
    if (range.since) params.set('since', range.since);
    else if (range.days) params.set('days', String(range.days));
    const qs = params.toString();
    return api.get<{ summary: AdminUsageSummaryRow[]; totals: AdminUsageTotals }>(`/admin/usage/summary${qs ? `?${qs}` : ''}`);
  },
  usageByUser: (range: { days?: number; since?: string }, limit = 50) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (range.since) params.set('since', range.since);
    else if (range.days) params.set('days', String(range.days));
    return api.get<{ users: AdminUserUsage[] }>(`/admin/usage/by-user?${params.toString()}`);
  },
  problems: (filters: { stack?: string; difficulty?: string; type?: string; topic?: string; validated?: string; sort?: string; page?: number }) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params.set(key, String(value));
    });
    const qs = params.toString();
    return api.get<{ problems: AdminProblemListItem[]; page: number; limit: number; total: number }>(
      `/admin/problems${qs ? `?${qs}` : ''}`
    );
  },
  users: (query: AdminUserQuery = {}) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') params.set(key, String(value));
    }
    const qs = params.toString();
    return api.get<AdminUserList>(`/admin/users${qs ? `?${qs}` : ''}`);
  },
  foundingMembers: () => api.get<{ members: AdminFoundingMember[]; total: number }>('/admin/founding-members'),
  safetyIncidents: (q: { view?: SafetyView; minSeverity?: SafetySeverity; page?: number }) => {
    const params = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => v !== undefined && params.set(k, String(v)));
    return api.get<SafetyIncidentList>(`/admin/safety/incidents?${params}`);
  },
  reviewIncident: (
    id: string,
    body: { status: 'dismissed' | 'reviewed'; notes?: string; action?: 'warn' | 'ban' | 'restore' }
  ) => api.post<{ incident: SafetyIncident }>(`/admin/safety/incidents/${id}/review`, body),
  recordReport: (id: string, body: { reportedTo: string; reference?: string }) =>
    api.post<{ incident: SafetyIncident }>(`/admin/safety/incidents/${id}/report`, body),
  setLegalHold: (id: string, hold: boolean) =>
    api.post<{ incident: SafetyIncident }>(`/admin/safety/incidents/${id}/hold`, { hold }),
  userHistory: (userId: string) =>
    api.get<{ incidents: AccountHistoryItem[] }>(`/admin/safety/users/${userId}/history`),
  userIps: (userId: string) => api.get<UserIpReport>(`/admin/safety/users/${userId}/ips`),
  setStanding: (userId: string, body: { action: 'ban' | 'restore'; reason?: string }) =>
    api.post<{ id: string; standing: AccountStanding }>(`/admin/users/${userId}/standing`, body),
  practiceAssignments: (q: AdminAssignmentQuery) => {
    const params = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => v !== undefined && v !== '' && params.set(k, String(v)));
    return api.get<AdminAssignmentList>(`/admin/practice/assignments?${params}`);
  },
  growth: (range: GrowthRange) => api.get<GrowthReport>(`/admin/growth?range=${range}`),
  setFreeAccess: (userId: string, grant: boolean) =>
    api.post<{ id: string; subscriptionStatus: string }>(`/admin/users/${userId}/free-access`, { grant }),
};
