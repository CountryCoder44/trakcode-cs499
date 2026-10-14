import { RequestHandler } from 'express';
import { z } from 'zod';
import { DemoCode } from '../models/DemoCode';
import { Problem } from '../models/Problem';
import { SkillRequest, SkillRequestStatus } from '../models/SkillRequest';
import { Notification } from '../models/Notification';
import { User } from '../models/User';

// ---- POST /admin/demo-codes ----
const createDemoCodeSchema = z.object({
  code: z.string().min(1),
  issuedTo: z.string().min(1),
  maxUses: z.number().int().positive(),
  expiresAt: z.string().datetime().optional(),
});

export const createDemoCode: RequestHandler = async (req, res, next) => {
  try {
    const body = createDemoCodeSchema.parse(req.body);
    const demoCode = await DemoCode.create({
      code: body.code.trim().toUpperCase(),
      issuedTo: body.issuedTo,
      maxUses: body.maxUses,
      usesRemaining: body.maxUses,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    });

    res.status(201).json({
      demoCode: {
        id: demoCode.id,
        code: demoCode.code,
        issuedTo: demoCode.issuedTo,
        maxUses: demoCode.maxUses,
        usesRemaining: demoCode.usesRemaining,
        expiresAt: demoCode.expiresAt ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
};

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

// ---- GET /admin/problems (filtered/paginated bank browser) ----
// Broader than listPendingReview above (which only ever shows
// validated:false rows) — this is the full bank, filterable, with
// timesServed visible so bank-reuse (the scalability mechanism confirmed
// this session — see problemBank.service.ts's findOrGenerateProblem) is
// actually observable rather than theoretical.
const listProblemsQuerySchema = z.object({
  stack: z.enum(['python', 'typescript', 'cpp']).optional(),
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

// ---- GET /admin/users (paginated, with per-user activity counts) ----
// First $lookup-based aggregation pipeline in this codebase — existing code
// elsewhere favors plain .find() + JS-side reduction (e.g.
// tutorContext.service.ts's getProgressSummary). Justified here: a single
// aggregated query is both simpler and cheaper than N+1 count queries per
// page of users. Collection names below ('submissions', 'tutorSessions',
// 'userProgress') match each model's explicit third-arg collection name,
// not its singular model name — see the respective model files.
const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
});

export const listUsers: RequestHandler = async (req, res, next) => {
  try {
    const q = listUsersQuerySchema.parse(req.query);

    const [users, total] = await Promise.all([
      User.aggregate([
        { $sort: { createdAt: -1 } },
        { $skip: (q.page - 1) * q.limit },
        { $limit: q.limit },
        { $lookup: { from: 'submissions', localField: '_id', foreignField: 'userId', as: 'submissions' } },
        { $lookup: { from: 'tutorSessions', localField: '_id', foreignField: 'userId', as: 'tutorSessions' } },
        {
          $lookup: {
            from: 'userProgress',
            let: { uid: '$_id' },
            pipeline: [{ $match: { $expr: { $and: [{ $eq: ['$userId', '$$uid'] }, { $eq: ['$status', 'complete'] }] } } }],
            as: 'completedLessons',
          },
        },
        {
          $project: {
            email: 1,
            name: 1,
            role: 1,
            subscriptionStatus: 1,
            createdAt: 1,
            submissionCount: { $size: '$submissions' },
            tutorSessionCount: { $size: '$tutorSessions' },
            completedLessonCount: { $size: '$completedLessons' },
          },
        },
      ]),
      User.countDocuments(),
    ]);

    res.json({
      users: users.map((u) => ({
        id: u._id.toString(),
        email: u.email,
        name: u.name,
        role: u.role,
        subscriptionStatus: u.subscriptionStatus,
        createdAt: u.createdAt,
        submissionCount: u.submissionCount,
        tutorSessionCount: u.tutorSessionCount,
        completedLessonCount: u.completedLessonCount,
      })),
      page: q.page,
      limit: q.limit,
      total,
    });
  } catch (err) {
    next(err);
  }
};

