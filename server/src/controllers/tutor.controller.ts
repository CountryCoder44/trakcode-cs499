import { NextFunction, RequestHandler, Response } from 'express';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { HydratedDocument } from 'mongoose';
import { TutorSession, ITutorSession } from '../models/TutorSession';
import { TutorMemory } from '../models/TutorMemory';
import { buildTutorContext, TutorContext } from '../services/tutorContext.service';
import { generateTutorReply, extractMemoryUpdate } from '../services/tutor.service';
import { TUTOR_CONVERSATION_WINDOW_MESSAGES } from '../config/constants';
import { assertCanAskTrak, assertTrakSpeed, recordTrakQuestion, returnTrakToken } from '../services/usageLimits.service';
import { PracticeAttempt } from '../models/PracticeAttempt';
import { clientIp, logIp } from '../services/ipLog.service';
import { MessageBudget } from '../services/tutor/budget';
import { replyModelFor } from '../services/tutor/routing';
import { moderateLearnerMessage } from '../services/tutor/moderation';
import { blockedReply, recordIncident, shouldBlock } from '../services/safety.service';

// A practice attempt remembers its Trak conversation, so reopening the
// assignment resumes the same chat instead of starting another.
async function linkPracticeSession(session: HydratedDocument<ITutorSession>): Promise<void> {
  if (session.contextType !== 'practiceAttempt') return;
  await PracticeAttempt.updateOne(
    { _id: session.contextId, userId: session.userId, tutorSessionId: { $exists: false } },
    { $set: { tutorSessionId: session.id } }
  );
}

// ---- POST /tutor/message ----
const messageSchema = z
  .object({
    sessionId: z.string().optional(),
    contextType: z.enum(['problem', 'seqItem', 'practiceAttempt']),
    contextId: z.string().min(1),
    message: z.string().min(1).optional(),
    // A new session's opening turn — Trak speaks first, no learner message
    // yet. See the `initiate` branch below.
    initiate: z.boolean().optional(),
    // The learner's current, unsaved editor buffer as of this exact
    // message — distinct from `latestSubmissionCode`, which only ever
    // reflects their last *submitted* solution. Cap mirrors the execution
    // sandbox's own MAX_CODE_LENGTH (services/execution-sandbox/src/controllers/execute.controller.ts).
    code: z.string().max(20_000).optional(),
  })
  .superRefine((body, ctx) => {
    if (!body.initiate && !body.message) {
      ctx.addIssue({ code: 'custom', path: ['message'], message: 'message is required unless initiate is true' });
    }
    if (body.initiate && body.sessionId) {
      ctx.addIssue({ code: 'custom', path: ['sessionId'], message: 'initiate cannot be combined with an existing sessionId' });
    }
  });

// Fire-and-forget after the response has already been sent — a memory
// extraction failure must never delay or break the reply itself.
function captureMemoryInBackground(
  userId: string,
  context: Parameters<typeof extractMemoryUpdate>[0],
  message: string,
  reply: string,
  budget?: MessageBudget
) {
  void extractMemoryUpdate(context, message, reply, undefined, budget)
    .then((result) => {
      if (result?.hasUpdate) {
        return TutorMemory.findOneAndUpdate(
          { userId },
          { $set: { goals: result.goals, personalNotes: result.personalNotes, topicSkills: result.topicSkills } }
        );
      }
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('tutor memory extraction failed', err);
    });
}

// The `initiate` branch: generates an opening-turn reply (Trak speaking first)
// from a synthetic kickoff and persists only the resulting assistant reply,
// never the synthetic trigger itself.
async function generateAndPersistOpeningTurn(
  session: HydratedDocument<ITutorSession>,
  context: TutorContext,
  conversation: Anthropic.MessageParam[]
): Promise<string> {
  const { text, revealed } = await generateTutorReply(context, conversation, { isOpeningTurn: true });
  session.messages.push({ role: 'tutor', content: text, timestamp: new Date() });
  if (revealed) session.revealedSolution = true;
  await session.save();
  await linkPracticeSession(session);
  return text;
}

async function touchTutorMemory(userId: string): Promise<void> {
  // Always cheap and synchronous — the "away for a while" clock resets on
  // every real exchange, independent of whether this one taught Trak
  // anything new (that's the separate, fire-and-forget extraction elsewhere).
  await TutorMemory.findOneAndUpdate(
    { userId },
    { $set: { lastInteractionAt: new Date() }, $setOnInsert: { goals: '', personalNotes: '', topicSkills: [] } },
    { upsert: true, setDefaultsOnInsert: true }
  );
}

export const sendMessage: RequestHandler = async (req, res, next) => {
  // Set once this request has taken a speed-limit token, so a failure on our
  // side can give it back (see usageLimits.service.ts).
  let speedTokenTakenBy: string | null = null;
  try {
    const body = messageSchema.parse(req.body);
    const userId = req.auth!.userId;

    if (body.initiate) {
      // Always a brand-new session — validation above already forbids
      // combining `initiate` with an existing `sessionId`.
      const session = new TutorSession({
        userId,
        contextType: body.contextType,
        contextId: body.contextId,
        messages: [],
      });

      const context = await buildTutorContext(userId, session.contextType, session.contextId.toString(), body.code, {
        createdAt: session.createdAt,
        messageCount: 0,
      });

      // Synthetic, NEVER-persisted kickoff turn — satisfies the Anthropic
      // Messages API's "first message must be role user" requirement
      // without it being a real learner utterance.
      const kickoff: Anthropic.MessageParam = {
        role: 'user',
        content: '[Session start — generate your opening message to the learner now, per the opening-turn guidance in your system prompt.]',
      };
      const reply = await generateAndPersistOpeningTurn(session, context, [kickoff]);

      // Create-on-first-use point for TutorMemory — nothing volunteered yet
      // on an opening turn, so just record that contact happened.
      await touchTutorMemory(userId);

      res.status(201).json({ sessionId: session.id, reply });
      return;
    }

    // A message the learner wrote: counts toward their allowance (Trak's
    // greetings above never do). Allowance first, so a learner who is out
    // doesn't also burn a speed-limit token.
    const usage = await assertCanAskTrak(userId);
    assertTrakSpeed(userId, usage.plan);
    if (usage.plan !== 'unlimited') speedTokenTakenBy = userId;
    logIp(userId, req, 'trak');

    let session = body.sessionId ? await TutorSession.findOne({ _id: body.sessionId, userId }) : null;
    if (!session) {
      // Not persisted yet — only .save()'d below once the reply actually
      // succeeds, so a failed generation (e.g. AI_API_KEY unset) never
      // leaves an orphaned empty session behind.
      session = new TutorSession({
        userId,
        contextType: body.contextType,
        contextId: body.contextId,
        messages: [],
      });
    } else if (session.contextType === 'seqItem' && body.contextId && body.contextId !== session.contextId) {
      // Ask Trak is one continuous, long-lived thread per learner that
      // follows them from item to item (AskTrakPanel.tsx never resets
      // sessionId on navigation) — unlike problem/practiceAttempt sessions,
      // which are fixed to one context for their whole life. Not persisted
      // until the reply below actually succeeds, same "don't record a change
      // on a failed turn" discipline as everything else in this handler.
      session.contextId = body.contextId;
      session.lastContextSwitchAt = new Date();
    }

    // Everything this message triggers draws from one budget (1.5¢ at most).
    const budget = new MessageBudget();

    // Safety screen, started now so it runs alongside building Trak's context.
    const moderation = moderateLearnerMessage(userId, [
      ...session.messages.slice(-4).map((m) => ({
        role: (m.role === 'tutor' ? 'assistant' : 'user') as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: body.message! },
    ], undefined, budget);

    const context = await buildTutorContext(userId, session.contextType, session.contextId.toString(), body.code, {
      createdAt: session.lastContextSwitchAt ?? session.createdAt,
      messageCount: Math.min(session.messages.length + 1, TUTOR_CONVERSATION_WINDOW_MESSAGES),
    });

    // Prior turns replay as conversation history; context is rebuilt fresh
    // each message and passed as system prompt (spec §6: "not stored
    // per-message, avoid bloating tutorSessions"). Windowed to the most
    // recent messages, not the full stored history — a seqItem session can
    // run for weeks across dozens of items, and without this every turn
    // would replay (and pay for) its entire lifetime. The full transcript is
    // still stored on `session.messages` either way (see TUTOR_CONVERSATION_WINDOW_MESSAGES).
    const recentMessages = session.messages.slice(-(TUTOR_CONVERSATION_WINDOW_MESSAGES - 1));
    const conversation: Anthropic.MessageParam[] = [
      ...recentMessages.map((m) => ({
        role: (m.role === 'tutor' ? 'assistant' : 'user') as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: body.message! },
    ];

    const verdict = await moderation;
    if (verdict.flagged) {
      const blocked = shouldBlock(verdict);
      // Saved for a person to review; never reported automatically.
      await recordIncident({
        userId,
        sessionId: session.isNew ? undefined : session.id,
        contextType: session.contextType,
        contextId: session.contextId.toString(),
        conversation,
        verdict,
        blocked,
        ip: clientIp(req),
      });
      if (blocked) {
        // Trak doesn't answer; the learner gets a fixed message. It still
        // counts toward their allowance.
        const reply = blockedReply(verdict);
        session.messages.push({ role: 'user', content: body.message!, timestamp: new Date() });
        session.messages.push({ role: 'tutor', content: reply, timestamp: new Date() });
        await session.save();
        await linkPracticeSession(session);
        const usageAfter = await recordTrakQuestion(userId, usage);
        speedTokenTakenBy = null;
        res.status(201).json({ sessionId: session.id, reply, usage: usageAfter });
        return;
      }
    }

    // Haiku for general questions, Sonnet when the learner seems stuck.
    const { text, revealed } = await generateTutorReply(
      context,
      conversation,
      { isOpeningTurn: false, model: replyModelFor(context, body.message!) },
      budget
    );

    session.messages.push({ role: 'user', content: body.message!, timestamp: new Date() });
    session.messages.push({ role: 'tutor', content: text, timestamp: new Date() });
    if (revealed) session.revealedSolution = true;
    await session.save();
    await linkPracticeSession(session);

    await touchTutorMemory(userId);
    const usageAfter = await recordTrakQuestion(userId, usage);
    speedTokenTakenBy = null;

    res.status(201).json({ sessionId: session.id, reply: text, usage: usageAfter });

    // Runs after the response is already sent — needs the FINAL accepted
    // reply, which the guardrail retry loop inside generateTutorReply may
    // have rewritten more than once before settling.
    captureMemoryInBackground(userId, context, body.message!, text, budget);
  } catch (err) {
    // Failed on our side after taking a speed-limit token: give it back.
    if (speedTokenTakenBy) returnTrakToken(speedTokenTakenBy);
    handleTutorError(err, res, next);
  }
};

// ---- GET /tutor/session/:id ----
export const getSession: RequestHandler = async (req, res, next) => {
  try {
    const session = await TutorSession.findOne({ _id: req.params.id, userId: req.auth!.userId });
    if (!session) {
      res.status(404).json({ error: 'Tutor session not found' });
      return;
    }
    res.json({
      session: {
        id: session.id,
        contextType: session.contextType,
        contextId: session.contextId,
        messages: session.messages,
        createdAt: session.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

function handleTutorError(err: unknown, res: Response, next: NextFunction) {
  if (err instanceof z.ZodError) {
    res.status(400).json({ error: 'Validation failed', details: err.flatten().fieldErrors });
    return;
  }
  if (err instanceof Error && err.message.includes('AI_API_KEY')) {
    res.status(503).json({ error: err.message });
    return;
  }
  if (err instanceof Error && err.message.includes('not found for this tutor session')) {
    res.status(404).json({ error: err.message });
    return;
  }
  next(err);
}

// ---- GET /tutor/seq-item/session ----
// Ask Trak is one continuous thread per learner (see sendMessage's seqItem
// branch above), so there's at most one — AskTrakPanel.tsx calls this on
// mount, before ever creating a session itself, so a page reload or
// navigating away and back resumes the same conversation instead of losing
// it. `session: null` (not a 404) means "no Ask Trak conversation yet,"
// which is the normal, expected first-ever-use state, not an error.
export const getLatestSeqItemSession: RequestHandler = async (req, res, next) => {
  try {
    const session = await TutorSession.findOne({ userId: req.auth!.userId, contextType: 'seqItem' }).sort({
      createdAt: -1,
    });
    res.json({
      session: session
        ? {
            id: session.id,
            contextType: session.contextType,
            contextId: session.contextId,
            messages: session.messages,
            createdAt: session.createdAt,
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
};

