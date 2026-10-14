import { RequestHandler } from 'express';
import { packsForUser } from '../services/trakPacks.service';
import { z } from 'zod';
import { Types } from 'mongoose';
import { Problem } from '../models/Problem';
import { SkillRequest, SkillRequestStatus } from '../models/SkillRequest';
import { Notification } from '../models/Notification';
import { AiUsageLog } from '../models/AiUsageLog';
import { User } from '../models/User';
import { EmailEntitlement } from '../models/EmailEntitlement';
import { emailKey } from '../services/entitlements.service';
import { env } from '../config/env';
import { practiceMetrics } from '../practice/metrics';
import { growthSeries, growthSummary } from '../services/growth.service';
import { PracticeAssignment } from '../models/PracticeAssignment';
import { PracticeAttempt } from '../models/PracticeAttempt';
import { advancedById, PRACTICE_LANGUAGES, PracticeLanguage } from '../practice/catalog';
import { LIBRARIES, LibraryEntry } from '../practice/library';

// ---- GET /admin/problems/pending-review ----
export const listPendingReview: RequestHandler = async (req, res, next) => {
  try {
    // §5 step 3: generations that exhausted retries are stored with
    // validated:false and are never served — this is the manual-review queue.
    const problems = await Problem.find({ validated: false }).sort({ createdAt: -1 }).limit(200);

    res.json({
      problems: problems.map((p) => ({
        id: p.id,
        stack: p.stack,
        topic: p.topic,
        difficulty: p.difficulty,
        type: p.type,
        prompt: p.prompt,
        tags: p.tags,
        createdAt: p.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
};

// ---- PUT /admin/roadmap/:id/status ----
const updateStatusSchema = z.object({
  status: z.enum(['requested', 'planned', 'in_progress', 'live']),
});

export const updateRoadmapStatus: RequestHandler = async (req, res, next) => {
  try {
    const { status } = updateStatusSchema.parse(req.body);
    const request = await SkillRequest.findById(req.params.id);
    if (!request) {
      res.status(404).json({ error: 'Skill request not found' });
      return;
    }

    const isNewlyLive = status === 'live' && request.status !== 'live';
    request.status = status as SkillRequestStatus;

    if (isNewlyLive) {
      request.liveAt = new Date();
      // Spec §3.8: "liveAt: ... triggers notifications" — notify voters,
      // the users who actually asked for this skill.
      if (request.votes.length > 0) {
        await Notification.insertMany(
          request.votes.map((userId) => ({
            userId,
            type: 'new_skill_live' as const,
            message: `${request.title} is now live on TrakCode!`,
          }))
        );
      }
    }

    await request.save();

    res.json({
      request: {
        id: request.id,
        title: request.title,
        status: request.status,
        liveAt: request.liveAt ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ---- GET /admin/usage/summary?days=7 (or ?since=<ISO>) ----
// Aggregated straight from AiUsageLog (server/src/models/AiUsageLog.ts) —
// see server/src/services/aiUsage.service.ts for what writes it and why
// estimatedCostUsd is a best-effort estimate, not a billing figure.
const usageSummaryQuerySchema = z.object({
  days: z.coerce.number().int().positive().optional(), // rolling window; omitted (with no `since` either) = all-time
  // Exact cutoff, e.g. local midnight for a "Today" view — not expressible
  // as a rolling `days` window. Wins over `days` when both are sent, though
  // the frontend only ever sends one or the other (AdminPage.tsx's
  // UsageRange). Added alongside `days` rather than replacing it so the
  // existing 7/30/90/all-time options keep their exact rolling semantics.
  since: z.string().datetime().optional(),
});

const EMPTY_USAGE_TOTALS = {
  callCount: 0,
  inputTokens: 0,
  outputTokens: 0,
  cacheCreationInputTokens: 0,
  cacheReadInputTokens: 0,
  estimatedCostUsd: 0,
};

// Shared by both usage endpoints below.
function buildUsageDateMatch(since: string | undefined, days: number | undefined): Record<string, unknown> {
  if (since) return { createdAt: { $gte: new Date(since) } };
  if (days) return { createdAt: { $gte: new Date(Date.now() - days * 86_400_000) } };
  return {};
}

export const getUsageSummary: RequestHandler = async (req, res, next) => {
  try {
    const { days, since } = usageSummaryQuerySchema.parse(req.query);
    const match = buildUsageDateMatch(since, days);

    const rows = await AiUsageLog.aggregate([
      { $match: match },
      {
        $group: {
          _id: { purpose: '$purpose', tier: '$tier', modelId: '$modelId' },
          callCount: { $sum: 1 },
          inputTokens: { $sum: '$inputTokens' },
          outputTokens: { $sum: '$outputTokens' },
          cacheCreationInputTokens: { $sum: '$cacheCreationInputTokens' },
          cacheReadInputTokens: { $sum: '$cacheReadInputTokens' },
          estimatedCostUsd: { $sum: '$estimatedCostUsd' },
        },
      },
      { $sort: { estimatedCostUsd: -1 } },
    ]);

    const summary = rows.map((r) => ({
      purpose: r._id.purpose as string,
      tier: r._id.tier as string,
      modelId: r._id.modelId as string,
      callCount: r.callCount as number,
      inputTokens: r.inputTokens as number,
      outputTokens: r.outputTokens as number,
      cacheCreationInputTokens: r.cacheCreationInputTokens as number,
      cacheReadInputTokens: r.cacheReadInputTokens as number,
      estimatedCostUsd: r.estimatedCostUsd as number,
    }));

    const totals = summary.reduce(
      (acc, r) => ({
        callCount: acc.callCount + r.callCount,
        inputTokens: acc.inputTokens + r.inputTokens,
        outputTokens: acc.outputTokens + r.outputTokens,
        cacheCreationInputTokens: acc.cacheCreationInputTokens + r.cacheCreationInputTokens,
        cacheReadInputTokens: acc.cacheReadInputTokens + r.cacheReadInputTokens,
        estimatedCostUsd: acc.estimatedCostUsd + r.estimatedCostUsd,
      }),
      EMPTY_USAGE_TOTALS
    );

    res.json({ summary, totals });
  } catch (err) {
    next(err);
  }
};

// ---- GET /admin/usage/by-user?days=7&limit=50 (or ?since=<ISO>) ----
// The direct answer to "what's the per-user token baseline" — sorted by
// estimated cost descending so the heaviest users surface first.
const usageByUserQuerySchema = z.object({
  days: z.coerce.number().int().positive().optional(),
  since: z.string().datetime().optional(), // see usageSummaryQuerySchema's comment
  limit: z.coerce.number().int().positive().max(200).default(50),
});

export const getUsageByUser: RequestHandler = async (req, res, next) => {
  try {
    const { days, since, limit } = usageByUserQuerySchema.parse(req.query);
    const match = buildUsageDateMatch(since, days);

    const rows = await AiUsageLog.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$userId',
          callCount: { $sum: 1 },
          inputTokens: { $sum: '$inputTokens' },
          outputTokens: { $sum: '$outputTokens' },
          cacheCreationInputTokens: { $sum: '$cacheCreationInputTokens' },
          cacheReadInputTokens: { $sum: '$cacheReadInputTokens' },
          estimatedCostUsd: { $sum: '$estimatedCostUsd' },
        },
      },
      { $sort: { estimatedCostUsd: -1 } },
      { $limit: limit },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    ]);

    res.json({
      users: rows.map((r) => ({
        // Null when a log row has no userId (a future system call, per
        // AiUsageLog's comment) — every current call site sets one.
        userId: r._id ? r._id.toString() : null,
        email: r.user?.email ?? '(unknown user)',
        name: r.user?.name ?? '(unknown user)',
        callCount: r.callCount,
        inputTokens: r.inputTokens,
        outputTokens: r.outputTokens,
        cacheCreationInputTokens: r.cacheCreationInputTokens,
        cacheReadInputTokens: r.cacheReadInputTokens,
        estimatedCostUsd: r.estimatedCostUsd,
      })),
    });
  } catch (err) {
    next(err);
  }
};

// ---- GET /admin/problems (filtered/paginated bank browser) ----
// Broader than listPendingReview above (which only ever shows
// validated:false rows) — this is the full bank, filterable, with
// timesServed visible so bank-reuse (the scalability mechanism confirmed
// this session — see problemBank.service.ts's findOrGenerateProblem) is
// actually observable rather than theoretical.
const listProblemsQuerySchema = z.object({
  stack: z.enum(['python', 'typescript', 'cpp', 'java']).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard', 'interview']).optional(),
  type: z.enum(['deep_dive', 'flash_bug', 'flash_fill']).optional(),
  topic: z.string().trim().min(1).optional(),
  validated: z.enum(['true', 'false']).optional(),
  sort: z.enum(['timesServed', 'createdAt']).default('createdAt'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
});

export const listProblems: RequestHandler = async (req, res, next) => {
  try {
    const q = listProblemsQuerySchema.parse(req.query);
    const filter: Record<string, unknown> = {};
    if (q.stack) filter.stack = q.stack;
    if (q.difficulty) filter.difficulty = q.difficulty;
    if (q.type) filter.type = q.type;
    if (q.topic) filter.topic = { $regex: q.topic, $options: 'i' };
    if (q.validated) filter.validated = q.validated === 'true';

    const [problems, total] = await Promise.all([
      Problem.find(filter)
        .sort({ [q.sort]: -1 })
        .skip((q.page - 1) * q.limit)
        .limit(q.limit),
      Problem.countDocuments(filter),
    ]);

    res.json({
      problems: problems.map((p) => ({
        id: p.id,
        stack: p.stack,
        topic: p.topic,
        difficulty: p.difficulty,
        type: p.type,
        prompt: p.prompt,
        validated: p.validated,
        timesServed: p.timesServed,
        tags: p.tags,
        createdAt: p.createdAt,
        requiredTopicNumber: p.requiredTopicNumber ?? null,
      })),
      page: q.page,
      limit: q.limit,
      total,
    });
  } catch (err) {
    next(err);
  }
};

// ---- GET /admin/users (search, filter, sort, paginated) ----
// One aggregation per page: the filter, sort and page run first, then per-user
// counts come from small $count sub-pipelines (not whole joined arrays).
// Founding status lives on EmailEntitlement, keyed by a normalized email, so
// it's matched in JS for just the users on this page.
const USER_SORTS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  email: { email: 1 },
  name: { name: 1 },
} as const;

const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
  q: z.string().trim().max(200).optional(),
  role: z.enum(['user', 'admin']).optional(),
  status: z.enum(['none', 'trial', 'active', 'past_due', 'canceled', 'demo']).optional(),
  sort: z.enum(['newest', 'oldest', 'email', 'name']).default('newest'),
});

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function countOf(from: string, extra: Record<string, unknown> = {}) {
  return {
    $lookup: {
      from,
      let: { uid: '$_id' },
      pipeline: [{ $match: { $expr: { $eq: ['$userId', '$$uid'] }, ...extra } }, { $count: 'n' }],
      as: `${from}Count`,
    },
  };
}
const sizeOf = (field: string) => ({ $ifNull: [{ $arrayElemAt: [`$${field}.n`, 0] }, 0] });

export const listUsers: RequestHandler = async (req, res, next) => {
  try {
    const q = listUsersQuerySchema.parse(req.query);
    const match: Record<string, unknown> = {};
    if (q.q) {
      const re = new RegExp(escapeRegex(q.q), 'i');
      match.$or = [{ email: re }, { name: re }];
    }
    if (q.role) match.role = q.role;
    if (q.status) match.subscriptionStatus = q.status;

    const [users, total, statusCounts, foundingTotal] = await Promise.all([
      User.aggregate([
        { $match: match },
        { $sort: { ...USER_SORTS[q.sort], _id: 1 } },
        { $skip: (q.page - 1) * q.limit },
        { $limit: q.limit },
        countOf('submissions'),
        countOf('tutorSessions'),
        countOf('seqProgress', { passedAt: { $exists: true } }),
        {
          $project: {
            email: 1,
            name: 1,
            role: 1,
            subscriptionStatus: 1,
            emailVerified: 1,
            deletionScheduledFor: 1,
            createdAt: 1,
            identities: '$identities.provider',
            submissionCount: sizeOf('submissionsCount'),
            tutorSessionCount: sizeOf('tutorSessionsCount'),
            itemsPassedCount: sizeOf('seqProgressCount'),
          },
        },
      ]),
      User.countDocuments(match),
      User.aggregate<{ _id: string; n: number }>([{ $group: { _id: '$subscriptionStatus', n: { $sum: 1 } } }]),
      EmailEntitlement.countDocuments({ foundingMember: true }),
    ]);

    const keys = users.map((u) => emailKey(u.email));
    const founding = new Set(
      (await EmailEntitlement.find({ emailKey: { $in: keys }, foundingMember: true }, { emailKey: 1 })).map(
        (e) => e.emailKey
      )
    );

    res.json({
      users: users.map((u) => ({
        id: u._id.toString(),
        email: u.email,
        name: u.name,
        role: u.role,
        subscriptionStatus: u.subscriptionStatus,
        emailVerified: !!u.emailVerified,
        foundingMember: founding.has(emailKey(u.email)),
        deletionScheduledFor: u.deletionScheduledFor ?? null,
        signInMethods: u.identities ?? [],
        createdAt: u.createdAt,
        submissionCount: u.submissionCount,
        tutorSessionCount: u.tutorSessionCount,
        itemsPassedCount: u.itemsPassedCount,
      })),
      page: q.page,
      limit: q.limit,
      total,
      counts: {
        byStatus: Object.fromEntries(statusCounts.map((c) => [c._id, c.n])),
        foundingMembers: foundingTotal,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ---- POST /admin/users/:id/free-access ----
// Give (or take back) full member access without a subscription: for people
// the owner invites personally. They sign up normally first (own password,
// confirmed email); this only flips their account to free access, which the
// paywall and allowances treat like a paying member. Stored as the 'demo'
// subscription status, shown everywhere as "Free access".
const freeAccessSchema = z.object({ grant: z.boolean() });

export const setFreeAccess: RequestHandler = async (req, res, next) => {
  try {
    const { grant } = freeAccessSchema.parse(req.body);
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    if (user.role === 'admin') {
      res.status(400).json({ error: 'Admins already have full access.' });
      return;
    }
    if (grant) {
      if (['trial', 'active', 'past_due'].includes(user.subscriptionStatus)) {
        res.status(409).json({
          error: 'This account has a Stripe trial or membership. Cancel that first, or they would be billed as well.',
        });
        return;
      }
      user.subscriptionStatus = 'demo';
    } else {
      if (user.subscriptionStatus !== 'demo') {
        res.status(400).json({ error: "This account doesn't have free access." });
        return;
      }
      user.subscriptionStatus = 'none';
    }
    await user.save();
    res.json({ id: user.id, subscriptionStatus: user.subscriptionStatus });
  } catch (err) {
    next(err);
  }
};

// ---- GET /admin/founding-members ----
// The founding-member list, which is kept per email and outlives accounts.
// Each row says whether an account currently uses that email (aliases count,
// via emailKey) and that account's subscription status. The Admin page can
// download it as CSV: the list Fireback can carry to future products.
export const listFoundingMembers: RequestHandler = async (_req, res, next) => {
  try {
    const members = await EmailEntitlement.find({ foundingMember: true }).sort({ foundingSince: 1, _id: 1 }).lean();
    const accounts = await User.find({}, { email: 1, subscriptionStatus: 1 }).lean();
    const byKey = new Map(accounts.map((a) => [emailKey(a.email), a]));

    const rows = members.map((m) => {
      const account = byKey.get(m.emailKey);
      return {
        email: m.email,
        foundingSince: m.foundingSince ?? m.firstSeenAt,
        sourceProduct: m.sourceProduct,
        hasAccount: !!account,
        accountEmail: account?.email ?? null,
        subscriptionStatus: account?.subscriptionStatus ?? null,
        trialUsed: !!m.trialUsedAt,
      };
    });

    res.json({ members: rows, total: rows.length });
  } catch (err) {
    next(err);
  }
};

// ---- GET /admin/practice/metrics?days=30 ----
// Shared-bank reuse, generation cost/latency/failures, and learner completion
// for long-form Practice Mode assignments. See practice/metrics.ts.
// ---- GET /admin/growth?range=week|month|6months|year ----
// Paying members against the year-one goal, trial conversion, churn, and a
// chart series for the chosen range.
const growthSchema = z.object({ range: z.enum(['week', 'month', '6months', 'year']).default('month') });

export const getGrowth: RequestHandler = async (req, res, next) => {
  try {
    const { range } = growthSchema.parse(req.query);
    const [summary, series] = await Promise.all([growthSummary(), growthSeries(range)]);
    res.json({ ...summary, range, series });
  } catch (err) {
    next(err);
  }
};

// ---- GET /admin/practice/assignments ----
// The practice bank for the Problem Bank tab: every built assignment plus the
// practice-library briefs nobody has started yet ("not built"). Filter by
// language, mode, size, status and source, search titles, sort, 20 per page.
type BankSort = 'newest' | 'oldest' | 'mostAssigned' | 'leastAssigned' | 'title' | 'language';

const listAssignmentsSchema = z.object({
  language: z.enum(PRACTICE_LANGUAGES as [PracticeLanguage, ...PracticeLanguage[]]).optional(),
  mode: z.enum(['basics', 'stretch']).optional(),
  scope: z.enum(['small', 'medium', 'large']).optional(),
  status: z.enum(['published', 'quarantined', 'disabled', 'unbuilt']).optional(),
  source: z.enum(['generated', 'legacy', 'library']).optional(),
  q: z.string().trim().max(100).optional(),
  sort: z.enum(['newest', 'oldest', 'mostAssigned', 'leastAssigned', 'title', 'language']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
});
const ASSIGNMENT_PAGE_SIZE = 20;

interface BankRow {
  id: string;
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

const conceptNames = (language: PracticeLanguage, ids: string[]) =>
  ids.map((id) => ({ id, name: advancedById(language, id)?.name ?? id }));

function compareRows(sort: BankSort) {
  const time = (r: BankRow) => (r.createdAt ? Date.parse(r.createdAt) : 0);
  return (a: BankRow, b: BankRow): number => {
    switch (sort) {
      case 'oldest':
        return time(a) - time(b) || a.title.localeCompare(b.title);
      case 'mostAssigned':
        return b.timesAssigned - a.timesAssigned || a.title.localeCompare(b.title);
      case 'leastAssigned':
        return a.timesAssigned - b.timesAssigned || a.title.localeCompare(b.title);
      case 'title':
        return a.title.localeCompare(b.title);
      case 'language':
        return a.language.localeCompare(b.language) || a.title.localeCompare(b.title);
      default:
        // Newest built first; unbuilt library briefs after, in library order.
        return time(b) - time(a) || (a.libraryId ?? '').localeCompare(b.libraryId ?? '');
    }
  };
}

export const listPracticeAssignments: RequestHandler = async (req, res, next) => {
  try {
    const q = listAssignmentsSchema.parse(req.query);
    const search = q.q?.toLowerCase();

    // Built assignments.
    const filter: Record<string, unknown> = {};
    if (q.language) filter.language = q.language;
    if (q.mode) filter.mode = q.mode;
    if (q.scope) filter.scope = q.scope;
    if (q.status) filter.status = q.status;
    if (q.source === 'library') filter.libraryId = { $exists: true };
    else if (q.source) filter.source = q.source;
    const built =
      q.status === 'unbuilt'
        ? []
        : await PracticeAssignment.find(filter)
            .select(
              'title language mode scope status source libraryId advancedConceptIds scenario goal requirements tests.visible timesAssigned createdAt'
            )
            .lean();
    const builtLibraryIds = new Set(
      (await PracticeAssignment.find({ libraryId: { $exists: true } }).select('libraryId').lean()).map((a) => a.libraryId)
    );

    const rows: BankRow[] = built
      .filter((a) => !search || a.title.toLowerCase().includes(search))
      .map((a) => ({
        id: a._id.toString(),
        built: true,
        title: a.title,
        language: a.language,
        mode: a.mode,
        scope: a.scope,
        status: a.status,
        source: a.source,
        libraryId: a.libraryId ?? null,
        concepts: conceptNames(a.language, a.advancedConceptIds),
        scenario: a.scenario,
        goal: a.goal,
        requirements: a.requirements,
        tests: { visible: a.tests.filter((t) => t.visible).length, hidden: a.tests.filter((t) => !t.visible).length },
        timesAssigned: a.timesAssigned,
        attempts: { inProgress: 0, completed: 0, abandoned: 0 },
        createdAt: a.createdAt ? new Date(a.createdAt).toISOString() : null,
      }));

    // Practice-library briefs nobody has started yet.
    const wantUnbuilt = (!q.status || q.status === 'unbuilt') && (!q.source || q.source === 'library');
    if (wantUnbuilt) {
      for (const [language, entries] of Object.entries(LIBRARIES) as [PracticeLanguage, LibraryEntry[]][]) {
        if (q.language && q.language !== language) continue;
        for (const e of entries) {
          if (builtLibraryIds.has(e.id)) continue;
          if (q.mode && q.mode !== e.mode) continue;
          if (q.scope && q.scope !== e.scope) continue;
          if (search && !e.title.toLowerCase().includes(search)) continue;
          rows.push({
            id: `library:${e.id}`,
            built: false,
            title: e.title,
            language,
            mode: e.mode,
            scope: e.scope,
            status: 'unbuilt',
            source: 'library',
            libraryId: e.id,
            concepts: conceptNames(language, e.concepts),
            scenario: e.scenario,
            goal: '',
            requirements: e.requirements,
            tests: { visible: 0, hidden: 0 },
            timesAssigned: 0,
            attempts: { inProgress: 0, completed: 0, abandoned: 0 },
            createdAt: null,
          });
        }
      }
    }

    rows.sort(compareRows(q.sort));
    const pageRows = rows.slice((q.page - 1) * ASSIGNMENT_PAGE_SIZE, q.page * ASSIGNMENT_PAGE_SIZE);

    // How learners got on with the built assignments on this page.
    const attempts = await PracticeAttempt.aggregate<{ _id: { a: unknown; s: string }; n: number }>([
      { $match: { assignmentId: { $in: pageRows.filter((r) => r.built).map((r) => new Types.ObjectId(r.id)) } } },
      { $group: { _id: { a: '$assignmentId', s: '$status' }, n: { $sum: 1 } } },
    ]);
    const byId = new Map(pageRows.map((r) => [r.id, r]));
    for (const a of attempts) {
      const row = byId.get(String(a._id.a));
      if (!row) continue;
      if (a._id.s === 'in_progress') row.attempts.inProgress += a.n;
      else if (a._id.s === 'completed') row.attempts.completed += a.n;
      else row.attempts.abandoned += a.n;
    }

    // Counts per language across the whole bank (built + unbuilt briefs).
    const byLanguage: Record<string, number> = {};
    const builtCounts = await PracticeAssignment.aggregate<{ _id: string; n: number }>([
      { $group: { _id: '$language', n: { $sum: 1 } } },
    ]);
    for (const b of builtCounts) byLanguage[b._id] = b.n;
    for (const [language, entries] of Object.entries(LIBRARIES)) {
      byLanguage[language] = (byLanguage[language] ?? 0) + entries.filter((e) => !builtLibraryIds.has(e.id)).length;
    }

    res.json({ page: q.page, pageSize: ASSIGNMENT_PAGE_SIZE, total: rows.length, byLanguage, items: pageRows });
  } catch (err) {
    next(err);
  }
};

export const getPracticeMetrics: RequestHandler = async (req, res, next) => {
  try {
    const days = z.coerce.number().int().min(1).max(365).default(30).parse(req.query.days ?? undefined);
    res.json(await practiceMetrics(new Date(Date.now() - days * 86_400_000)));
  } catch (err) {
    next(err);
  }
};

// ---- GET /admin/users/:id/packs ----
// A learner's tutoring packs with how many of each pack's questions were used,
// and whether it still qualifies for the 7-day unused-pack refund.
export const listUserPacks: RequestHandler = async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const user = await User.findById(req.params.id).select('email bonusTrakQuestions');
    res.json({
      email: user?.email ?? null,
      balance: user?.bonusTrakQuestions ?? 0,
      packs: await packsForUser(req.params.id),
    });
  } catch (err) {
    next(err);
  }
};
