import { RequestHandler } from 'express';
import { z } from 'zod';
import { FilterQuery } from 'mongoose';
import { ISafetyIncident, SafetyIncident, SAFETY_SEVERITIES } from '../models/SafetyIncident';
import { User } from '../models/User';
import { UserIp } from '../models/UserIp';
import { accountsSharingIps } from '../services/ipLog.service';
import { accountHistory, recordReport, reviewIncident, setLegalHold, setStanding, standingOf } from '../services/safety.service';

// Admin, Safety: the review queue for flagged Trak messages. Every decision
// here is a person's; nothing is reported or actioned automatically.

// ---- GET /admin/safety/incidents?view=&minSeverity=&page= ----
// Views: open = still to review; actioned = reviewed and the account was
// warned or banned, or a report was recorded; closed = reviewed or
// dismissed with no action.
const VIEW_FILTERS: Record<'open' | 'actioned' | 'closed', FilterQuery<ISafetyIncident>> = {
  open: { status: 'open' },
  actioned: { status: { $ne: 'open' }, $or: [{ action: { $ne: 'none' } }, { reportedTo: { $exists: true } }] },
  closed: { status: { $ne: 'open' }, action: 'none', reportedTo: { $exists: false } },
};

const listSchema = z.object({
  view: z.enum(['open', 'actioned', 'closed']).default('open'),
  minSeverity: z.enum(SAFETY_SEVERITIES).default('low'),
  page: z.coerce.number().int().min(1).default(1),
});
const PAGE_SIZE = 25;

export const listIncidents: RequestHandler = async (req, res, next) => {
  try {
    const q = listSchema.parse(req.query);
    const severities = SAFETY_SEVERITIES.slice(SAFETY_SEVERITIES.indexOf(q.minSeverity));
    const filter: Record<string, unknown> = { ...VIEW_FILTERS[q.view], severity: { $in: severities } };
    const [items, total, openCount, actionedCount, closedCount] = await Promise.all([
      SafetyIncident.find(filter)
        // The review queue shows newest flags first; the other views show newest decisions first.
        .sort(q.view === 'open' ? { createdAt: -1 } : { reviewedAt: -1, createdAt: -1 })
        .skip((q.page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .lean(),
      SafetyIncident.countDocuments(filter),
      SafetyIncident.countDocuments({ status: 'open', severity: { $in: ['medium', 'high', 'critical'] } }),
      SafetyIncident.countDocuments(VIEW_FILTERS.actioned),
      SafetyIncident.countDocuments(VIEW_FILTERS.closed),
    ]);

    // Each learner's current standing and how many incidents they have in total.
    const userIds = [...new Set(items.map((i) => i.userId.toString()))];
    const [users, counts] = await Promise.all([
      User.find({ _id: { $in: userIds } }).select('role bannedAt standingReason'),
      SafetyIncident.aggregate<{ _id: unknown; n: number }>([
        { $match: { userId: { $in: items.map((i) => i.userId) } } },
        { $group: { _id: '$userId', n: { $sum: 1 } } },
      ]),
    ]);
    const userById = new Map(users.map((u) => [u.id as string, u]));
    const countById = new Map(counts.map((c) => [String(c._id), c.n]));

    res.json({
      page: q.page,
      pageSize: PAGE_SIZE,
      total,
      openCount,
      actionedCount,
      closedCount,
      items: items.map((i) => {
        const u = userById.get(i.userId.toString());
        return {
          ...i,
          id: i._id.toString(),
          accountDeleted: !u,
          standing: u ? standingOf(u) : null,
          incidentsForUser: countById.get(i.userId.toString()) ?? 1,
        };
      }),
    });
  } catch (err) {
    next(err);
  }
};

// ---- GET /admin/safety/users/:id/ips ---- addresses this account used, and other accounts seen at them
export const userIps: RequestHandler = async (req, res, next) => {
  try {
    const rows = await UserIp.find({ userId: req.params.id }).sort({ lastSeenAt: -1 }).limit(50).lean();
    const shared = await accountsSharingIps(
      String(req.params.id),
      rows.map((r) => r.ip),
    );
    const others = await User.find({ _id: { $in: shared.map((s) => s.userId) } }).select('email');
    const emailById = new Map(others.map((u) => [u.id as string, u.email]));
    res.json({
      ips: rows.map((r) => ({
        ip: r.ip,
        events: r.events,
        count: r.count,
        firstSeenAt: r.firstSeenAt,
        lastSeenAt: r.lastSeenAt,
      })),
      sharedWith: shared.map((s) => ({ ...s, email: emailById.get(s.userId) ?? '(deleted)' })),
    });
  } catch (err) {
    next(err);
  }
};

// ---- GET /admin/safety/users/:id/history ---- every flag on this account, with warning dates
export const userHistory: RequestHandler = async (req, res, next) => {
  try {
    res.json({ incidents: await accountHistory(String(req.params.id)) });
  } catch (err) {
    next(err);
  }
};

// ---- POST /admin/safety/incidents/:id/review ----
const reviewSchema = z.object({
  status: z.enum(['dismissed', 'reviewed']),
  notes: z.string().max(4000).optional(),
  action: z.enum(['warn', 'ban', 'restore']).optional(),
});

export const review: RequestHandler = async (req, res, next) => {
  try {
    const body = reviewSchema.parse(req.body);
    const incident = await reviewIncident(String(req.params.id), req.auth!.userId, body);
    res.json({ incident });
  } catch (err) {
    next(err);
  }
};

// ---- POST /admin/safety/incidents/:id/report ---- record a report a person already made
const reportSchema = z.object({
  reportedTo: z.string().min(2).max(200),
  reference: z.string().max(200).optional(),
});

export const report: RequestHandler = async (req, res, next) => {
  try {
    const body = reportSchema.parse(req.body);
    const incident = await recordReport(String(req.params.id), body);
    res.json({ incident });
  } catch (err) {
    next(err);
  }
};

// ---- POST /admin/safety/incidents/:id/hold ---- keep past normal retention (legal matter)
const holdSchema = z.object({ hold: z.boolean() });

export const hold: RequestHandler = async (req, res, next) => {
  try {
    const body = holdSchema.parse(req.body);
    res.json({ incident: await setLegalHold(String(req.params.id), body.hold) });
  } catch (err) {
    next(err);
  }
};

// ---- POST /admin/users/:id/standing ---- ban or restore an account directly
const standingSchema = z.object({
  action: z.enum(['ban', 'restore']),
  reason: z.string().max(1000).optional(),
});

export const setUserStanding: RequestHandler = async (req, res, next) => {
  try {
    const body = standingSchema.parse(req.body);
    const user = await setStanding(String(req.params.id), body.action, { reason: body.reason });
    res.json({ id: user.id, standing: standingOf(user) });
  } catch (err) {
    next(err);
  }
};
