import { RequestHandler } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { env } from '../config/env';
import { AppError, NotFoundError } from '../errors/AppError';
import { FeedbackScreenshot } from '../models/FeedbackScreenshot';
import { FeedbackThread, IFeedbackThread } from '../models/FeedbackThread';
import { User } from '../models/User';
import { sendEmail } from '../services/email/mailer';
import { feedbackAlertEmail } from '../services/email/templates';

// Feedback button + Messages inbox (learner side) and the admin Feedback inbox.

export const FEEDBACK_MAX_CHARS = 1000;
export const TEAM_REPLY_MAX_CHARS = 4000;
/** Decoded screenshot size limit. The client sends a downscaled JPEG well under this. */
export const SCREENSHOT_MAX_BYTES = 2.5 * 1024 * 1024;

export const FEEDBACK_RECEIVED_REPLY =
  "Thanks for your feedback! We've received it, and someone on the TrakCode team reads every message. " +
  "If we have a question or an update for you, we'll reply right here in Messages.";

const IMAGE_SIGNATURES: { type: string; bytes: number[] }[] = [
  { type: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { type: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
];

/** Decodes a `data:image/...;base64,` URL and checks the bytes really are a JPEG or PNG. */
export function decodeScreenshot(dataUrl: string): { contentType: string; data: Buffer } {
  const match = /^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw new AppError("The screenshot couldn't be read. Try again without it.", 400);
  const data = Buffer.from(match[2], 'base64');
  if (data.length === 0) throw new AppError("The screenshot couldn't be read. Try again without it.", 400);
  if (data.length > SCREENSHOT_MAX_BYTES) throw new AppError('The screenshot is too large. Try again without it.', 413);
  const sig = IMAGE_SIGNATURES.find((s) => s.type === match[1]);
  if (!sig || !sig.bytes.every((b, i) => data[i] === b)) {
    throw new AppError("The screenshot couldn't be read. Try again without it.", 400);
  }
  return { contentType: sig.type, data };
}

function preview(thread: IFeedbackThread): string {
  const last = thread.messages[thread.messages.length - 1];
  const text = last?.body ?? '';
  return text.length > 140 ? `${text.slice(0, 140)}...` : text;
}

function firstUserMessage(thread: IFeedbackThread): string {
  return thread.messages.find((m) => m.from === 'user')?.body ?? '';
}

function threadSummary(thread: IFeedbackThread) {
  const first = firstUserMessage(thread);
  return {
    id: thread.id as string,
    kind: thread.kind ?? 'bug',
    subject: first.length > 80 ? `${first.slice(0, 80)}...` : first,
    preview: preview(thread),
    status: thread.status,
    unread: thread.unreadForUser,
    hasScreenshot: thread.hasScreenshot,
    lastMessageAt: thread.lastMessageAt,
    createdAt: thread.createdAt,
  };
}

function threadDetail(thread: IFeedbackThread) {
  return {
    ...threadSummary(thread),
    pagePath: thread.pagePath,
    messages: thread.messages.map((m) => ({ from: m.from, body: m.body, createdAt: m.createdAt })),
  };
}

function objectId(id: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) throw new NotFoundError('Message not found');
  return new Types.ObjectId(id);
}

// ---- POST /feedback ----
const submitSchema = z.object({
  kind: z.enum(['bug', 'idea']).default('bug'),
  message: z.string().trim().min(1, 'Write a message first.').max(FEEDBACK_MAX_CHARS),
  screenshot: z.string().max(4 * 1024 * 1024).optional(),
  pagePath: z.string().max(500).default(''),
  viewport: z.string().max(40).default(''),
});

export const submitFeedback: RequestHandler = async (req, res, next) => {
  try {
    const body = submitSchema.parse(req.body);
    const shot = body.screenshot ? decodeScreenshot(body.screenshot) : null;
    const user = await User.findById(req.auth!.userId).select('email name');
    if (!user) throw new NotFoundError('Account not found');

    const now = new Date();
    const thread = await FeedbackThread.create({
      userId: user._id,
      kind: body.kind,
      userEmail: user.email,
      userName: user.name ?? '',
      // Only ever a path inside the app, never a full URL.
      pagePath: body.pagePath.startsWith('/') ? body.pagePath : '',
      userAgent: String(req.get('user-agent') ?? '').slice(0, 300),
      viewport: body.viewport,
      hasScreenshot: Boolean(shot),
      messages: [
        { from: 'user', body: body.message, createdAt: now },
        { from: 'system', body: FEEDBACK_RECEIVED_REPLY, createdAt: new Date(now.getTime() + 1) },
      ],
      unreadForUser: 1,
      unreadForTeam: true,
      lastMessageAt: now,
    });
    if (shot) {
      await FeedbackScreenshot.create({ threadId: thread._id, userId: user._id, ...shot });
    }

    const link = `${(env.FRONTEND_URL ?? 'http://localhost:5173').replace(/\/$/, '')}/admin?tab=feedback`;
    sendEmail(
      // Same team inbox as safety alerts (support@ by default).
      feedbackAlertEmail(env.SAFETY_ALERT_EMAIL, {
        kind: body.kind,
        userEmail: user.email,
        message: body.message,
        pagePath: thread.pagePath,
        hasScreenshot: Boolean(shot),
      }, link)
    ).catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[feedback] alert email failed', err);
    });

    res.status(201).json({ thread: threadDetail(thread) });
  } catch (err) {
    next(err);
  }
};

// ---- GET /feedback/threads ----
export const listMyThreads: RequestHandler = async (req, res, next) => {
  try {
    const threads = await FeedbackThread.find({ userId: req.auth!.userId }).sort({ lastMessageAt: -1 }).limit(100);
    res.json({ threads: threads.map(threadSummary) });
  } catch (err) {
    next(err);
  }
};

// ---- GET /feedback/unread ----
export const getMyUnread: RequestHandler = async (req, res, next) => {
  try {
    const [row] = await FeedbackThread.aggregate<{ total: number }>([
      { $match: { userId: new Types.ObjectId(req.auth!.userId), unreadForUser: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$unreadForUser' } } },
    ]);
    res.json({ unread: row?.total ?? 0 });
  } catch (err) {
    next(err);
  }
};

// ---- GET /feedback/threads/:id ---- (opening it marks it read)
export const getMyThread: RequestHandler = async (req, res, next) => {
  try {
    const thread = await FeedbackThread.findOneAndUpdate(
      { _id: objectId(req.params.id), userId: req.auth!.userId },
      { $set: { unreadForUser: 0 } },
      { new: true }
    );
    if (!thread) throw new NotFoundError('Message not found');
    res.json({ thread: threadDetail(thread) });
  } catch (err) {
    next(err);
  }
};

async function sendScreenshot(threadFilter: Record<string, unknown>, res: Parameters<RequestHandler>[1]) {
  const thread = await FeedbackThread.findOne(threadFilter).select('_id');
  if (!thread) throw new NotFoundError('Screenshot not found');
  const shot = await FeedbackScreenshot.findOne({ threadId: thread._id });
  if (!shot) throw new NotFoundError('Screenshot not found');
  res.setHeader('Content-Type', shot.contentType);
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.send(shot.data);
}

// ---- GET /feedback/threads/:id/screenshot ----
export const getMyScreenshot: RequestHandler = async (req, res, next) => {
  try {
    await sendScreenshot({ _id: objectId(req.params.id), userId: req.auth!.userId }, res);
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// Admin

const PAGE_SIZE = 20;

// ---- GET /admin/feedback?status=open|closed|all&kind=bug|idea|all&page= ----
export const adminListFeedback: RequestHandler = async (req, res, next) => {
  try {
    const status = ['open', 'closed', 'all'].includes(String(req.query.status)) ? String(req.query.status) : 'open';
    const page = Math.max(1, Number(req.query.page) || 1);
    const kind = ['bug', 'idea'].includes(String(req.query.kind)) ? String(req.query.kind) : null;
    const filter: Record<string, string> = {};
    if (status !== 'all') filter.status = status;
    if (kind) filter.kind = kind;
    const [threads, total, openCount, unreadCount] = await Promise.all([
      FeedbackThread.find(filter)
        .sort({ lastMessageAt: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE),
      FeedbackThread.countDocuments(filter),
      FeedbackThread.countDocuments({ status: 'open' }),
      FeedbackThread.countDocuments({ unreadForTeam: true }),
    ]);
    res.json({
      threads: threads.map((t) => ({
        ...threadSummary(t),
        userId: t.userId.toString(),
        userEmail: t.userEmail,
        userName: t.userName,
        unreadForTeam: t.unreadForTeam,
        firstMessage: firstUserMessage(t),
        replies: t.messages.filter((m) => m.from === 'team').length,
      })),
      total,
      page,
      pageSize: PAGE_SIZE,
      openCount,
      unreadCount,
    });
  } catch (err) {
    next(err);
  }
};

function adminDetail(thread: IFeedbackThread) {
  return {
    ...threadDetail(thread),
    userId: thread.userId.toString(),
    userEmail: thread.userEmail,
    userName: thread.userName,
    userAgent: thread.userAgent,
    viewport: thread.viewport,
    unreadForTeam: thread.unreadForTeam,
  };
}

// ---- GET /admin/feedback/:id ---- (opening it marks it read for the team)
export const adminGetFeedback: RequestHandler = async (req, res, next) => {
  try {
    const thread = await FeedbackThread.findByIdAndUpdate(
      objectId(req.params.id),
      { $set: { unreadForTeam: false } },
      { new: true }
    );
    if (!thread) throw new NotFoundError('Feedback not found');
    res.json({ thread: adminDetail(thread) });
  } catch (err) {
    next(err);
  }
};

// ---- GET /admin/feedback/:id/screenshot ----
export const adminGetScreenshot: RequestHandler = async (req, res, next) => {
  try {
    await sendScreenshot({ _id: objectId(req.params.id) }, res);
  } catch (err) {
    next(err);
  }
};

// ---- POST /admin/feedback/:id/reply ----
const replySchema = z.object({ body: z.string().trim().min(1, 'Write a reply first.').max(TEAM_REPLY_MAX_CHARS) });

export const adminReply: RequestHandler = async (req, res, next) => {
  try {
    const { body } = replySchema.parse(req.body);
    const now = new Date();
    const thread = await FeedbackThread.findByIdAndUpdate(
      objectId(req.params.id),
      {
        $push: { messages: { from: 'team', body, createdAt: now } },
        $inc: { unreadForUser: 1 },
        $set: { lastMessageAt: now, unreadForTeam: false },
      },
      { new: true }
    );
    if (!thread) throw new NotFoundError('Feedback not found');
    res.json({ thread: adminDetail(thread) });
  } catch (err) {
    next(err);
  }
};

// ---- POST /admin/feedback/:id/status ----
const statusSchema = z.object({ status: z.enum(['open', 'closed']) });

export const adminSetStatus: RequestHandler = async (req, res, next) => {
  try {
    const { status } = statusSchema.parse(req.body);
    const thread = await FeedbackThread.findByIdAndUpdate(objectId(req.params.id), { $set: { status } }, { new: true });
    if (!thread) throw new NotFoundError('Feedback not found');
    res.json({ thread: adminDetail(thread) });
  } catch (err) {
    next(err);
  }
};
