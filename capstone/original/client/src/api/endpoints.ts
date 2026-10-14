import { api } from './client';
import type {
  User,
  Stack,
  Difficulty,
  ProblemType,
  ExecutionLanguage,
  CurriculumTreeItem,
  CurriculumItemDetail,
  LearnerState,
  ProgressEntry,
  Problem,
  SubmissionResult,
  CurriculumAdvance,
  SubmissionHistoryEntry,
  TutorSession,
  PortfolioEntry,
  ActivitySummary,
  PublicProfile,
  RoadmapRequest,
  BillingStatus,
  AdminPendingProblem,
  AdminUsageSummaryRow,
  AdminUsageTotals,
  AdminUserUsage,
  AdminProblemListItem,
  AdminUserListItem,
} from './types';

// ---- Auth ----
export const authApi = {
  signup: (body: { email: string; password: string; name: string }) =>
    api.post<{ token: string; user: User }>('/auth/signup', body, false),
  login: (body: { email: string; password: string }) =>
    api.post<{ token: string; user: User }>('/auth/login', body, false),
  redeemDemoCode: (code: string) => api.post<{ token: string; user: User }>('/auth/demo-code/redeem', { code }),
  me: () => api.get<{ user: User }>('/auth/me'),
};

// ---- Learn Mode ----
export const learnApi = {
  listCurriculum: (stack: Stack) => api.get<{ stack: Stack; items: CurriculumTreeItem[] }>(`/curriculum?stack=${stack}`),
  getItem: (id: string) => api.get<{ item: CurriculumItemDetail; learnerState: LearnerState }>(`/curriculum/${id}`),
  resetProgress: (id: string) =>
    api.post<{ progress: { curriculumItemId: string; status: string; unaidedPassCount: number } }>(
      `/curriculum/${id}/reset-progress`
    ),
  getProgress: (stack: Stack) => api.get<{ stack: Stack; progress: ProgressEntry[] }>(`/progress?stack=${stack}`),
};

// ---- Practice Mode ----
export const practiceApi = {
  requestDeepDive: (body: { stack: Stack; topic?: string; difficulty: Difficulty }) =>
    api.post<{ problem: Problem }>('/practice/deep-dive/request', body),
  requestFlashCard: (body: { stack: Stack; type: Extract<ProblemType, 'flash_bug' | 'flash_fill'> }) =>
    api.post<{ problem: Problem }>('/practice/flash-card/request', body),
  getProblem: (id: string) => api.get<{ problem: Problem }>(`/practice/problem/${id}`),
  submit: (body: { problemId: string; code: string; language: ExecutionLanguage }) =>
    api.post<{ submission: SubmissionResult; curriculumAdvance?: CurriculumAdvance }>('/practice/submit', body),
  history: () => api.get<{ submissions: SubmissionHistoryEntry[] }>('/practice/history'),
};

// ---- Tutor ----
export const tutorApi = {
  sendMessage: (body: {
    sessionId?: string;
    contextType: 'problem' | 'curriculumItem';
    contextId: string;
    // Optional because a session's opening turn (`initiate: true`/
    // `beginNextRound: true`) has no learner message yet — Trak speaks first.
    message?: string;
    initiate?: boolean;
    // Retrigger a check-in on an existing curriculumItem session, between
    // Learn Mode practice rounds — see TutorChat.tsx's `triggerNextRound` prop.
    beginNextRound?: boolean;
    // The learner's current, unsaved editor buffer — lets Trak see what's
    // actually on screen, not just their last graded submission.
    code?: string;
  }) => api.post<{ sessionId: string; reply: string; readyForPractice?: boolean; problem?: Problem }>('/tutor/message', body),
  getSession: (id: string) => api.get<{ session: TutorSession }>(`/tutor/session/${id}`),
};

// ---- Portfolio ----
export const portfolioApi = {
  push: (submissionId: string) => api.post<{ githubRepoUrl: string }>('/portfolio/push', { submissionId }),
  list: () => api.get<{ portfolio: PortfolioEntry[] }>('/portfolio'),
};

// ---- Profile ----
export const profileApi = {
  getPublic: (slug: string) => api.get<PublicProfile>(`/profile/${slug}`, false),
  updateSettings: (body: { isPublic?: boolean; slug?: string; showPortfolioLinks?: boolean }) =>
    api.put<{ profile: User['profile'] }>('/profile/settings', body),
  myActivity: () => api.get<ActivitySummary>('/profile/me/activity'),
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
  checkout: (plan: 'monthly' | 'annual') => api.post<{ url: string }>('/billing/checkout-session', { plan }),
  cancel: () => api.post<{ cancelAtPeriodEnd: boolean; currentPeriodEnd: string }>('/billing/cancel'),
};

// ---- Admin ----
export const adminApi = {
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
  users: (page = 1) => api.get<{ users: AdminUserListItem[]; page: number; limit: number; total: number }>(`/admin/users?page=${page}`),
};
