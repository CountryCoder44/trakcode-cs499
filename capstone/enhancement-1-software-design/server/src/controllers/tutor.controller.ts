import { RequestHandler } from 'express';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { HydratedDocument } from 'mongoose';
import { TutorSession, ITutorSession } from '../models/TutorSession';
import { TutorMemory } from '../models/TutorMemory';
import { CurriculumItem } from '../models/CurriculumItem';
import { UserProgress } from '../models/UserProgress';
import { buildTutorContext, TutorContext } from '../services/tutorContext.service';
import { generateTutorReply, extractMemoryUpdate, classifyReadyForPractice } from '../services/tutor.service';
import { attachNextProblem } from '../services/curriculumPractice.service';
import { toClientProblem } from '../services/problemBank.service';

// ---- POST /tutor/message ----
const messageSchema = z
  .object({
    sessionId: z.string().optional(),
    contextType: z.enum(['problem', 'curriculumItem']),
    contextId: z.string().min(1),
    message: z.string().min(1).optional(),
    // A new session's opening turn — Trak speaks first, no learner message
    // yet. See the `initiate` branch below.
    initiate: z.boolean().optional(),
    // Retrigger a check-in on an EXISTING curriculumItem session, between
    // practice rounds — Trak speaks first again, but the conversation
    // continues rather than forking a new session. See the `beginNextRound`
    // branch below.
    beginNextRound: z.boolean().optional(),
    // The learner's current, unsaved editor buffer as of this exact
    // message — distinct from `latestSubmissionCode`, which only ever
    // reflects their last *submitted* solution. Cap mirrors the execution
    // sandbox's own MAX_CODE_LENGTH (services/execution-sandbox/src/controllers/execute.controller.ts).
    code: z.string().max(20_000).optional(),
  })
  .superRefine((body, ctx) => {
    if (!body.initiate && !body.beginNextRound && !body.message) {
      ctx.addIssue({ code: 'custom', path: ['message'], message: 'message is required unless initiate or beginNextRound is true' });
    }
    if (body.initiate && body.sessionId) {
      ctx.addIssue({ code: 'custom', path: ['sessionId'], message: 'initiate cannot be combined with an existing sessionId' });
    }
    if (body.initiate && body.beginNextRound) {
      ctx.addIssue({ code: 'custom', path: ['beginNextRound'], message: 'beginNextRound cannot be combined with initiate' });
    }
    if (body.beginNextRound) {
      if (!body.sessionId) {
        ctx.addIssue({ code: 'custom', path: ['sessionId'], message: 'beginNextRound requires an existing sessionId' });
      }
      if (body.message) {
        ctx.addIssue({ code: 'custom', path: ['message'], message: 'beginNextRound cannot be combined with a message' });
      }
      if (body.contextType !== 'curriculumItem') {
        ctx.addIssue({ code: 'custom', path: ['contextType'], message: 'beginNextRound is only valid for curriculumItem context' });
      }
    }
  });

// Fire-and-forget after the response has already been sent — a memory
// extraction failure must never delay or break the reply itself.
function captureMemoryInBackground(userId: string, context: Parameters<typeof extractMemoryUpdate>[0], message: string, reply: string) {
  void extractMemoryUpdate(context, message, reply)
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

// Shared by the `initiate` and `beginNextRound` branches — both generate an
// opening-turn reply (Trak speaking first) from a caller-built conversation
// (a single synthetic kickoff for `initiate`, the replayed history plus a
// synthetic round-transition trigger for `beginNextRound`) and persist only
// the resulting assistant reply, never the synthetic trigger itself.
async function generateAndPersistOpeningTurn(
  session: HydratedDocument<ITutorSession>,
  context: TutorContext,
  conversation: Anthropic.MessageParam[]
): Promise<string> {
  const { text, revealed } = await generateTutorReply(context, conversation, { isOpeningTurn: true });
  session.messages.push({ role: 'tutor', content: text, timestamp: new Date() });
  if (revealed) session.revealedSolution = true;
  await session.save();
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

    if (body.beginNextRound) {
      const session = await TutorSession.findOne({ _id: body.sessionId, userId });
      if (!session) {
        res.status(404).json({ error: 'Tutor session not found' });
        return;
      }

      const progress = await UserProgress.findOne({ userId, curriculumItemId: session.contextId });
      if (progress?.currentProblemId) {
        // Stale/duplicate retrigger (e.g. a multi-tab race) — a problem is
        // already attached, so this round already began. Don't generate a
        // second check-in; just hand back the existing latest tutor message.
        const lastTutorMessage = [...session.messages].reverse().find((m) => m.role === 'tutor');
        res.status(201).json({ sessionId: session.id, reply: lastTutorMessage?.content ?? '' });
        return;
      }

      const context = await buildTutorContext(userId, session.contextType, session.contextId.toString(), body.code, {
        createdAt: session.createdAt,
        messageCount: session.messages.length,
      });

      const conversation: Anthropic.MessageParam[] = [
        ...session.messages.map((m) => ({
          role: (m.role === 'tutor' ? 'assistant' : 'user') as 'user' | 'assistant',
          content: m.content,
        })),
        {
          role: 'user',
          content:
            '[Round transition — the learner just passed the previous question. Generate your next check-in message now, per the round-transition guidance in your system prompt.]',
        },
      ];
      const reply = await generateAndPersistOpeningTurn(session, context, conversation);

      await touchTutorMemory(userId);

      res.status(201).json({ sessionId: session.id, reply });
      return;
    }

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
    }

    const context = await buildTutorContext(userId, session.contextType, session.contextId.toString(), body.code, {
      createdAt: session.createdAt,
      messageCount: session.messages.length,
    });

    // Prior turns replay as conversation history; context is rebuilt fresh
    // each message and passed as system prompt (spec §6: "not stored
    // per-message, avoid bloating tutorSessions").
    const conversation: Anthropic.MessageParam[] = [
      ...session.messages.map((m) => ({
        role: (m.role === 'tutor' ? 'assistant' : 'user') as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: body.message! },
    ];

    // Only meaningful for a curriculumItem session currently mid-calibration
    // (no problem attached yet) — every round's calibration, not just the
    // first, since phase is derived from UserProgress.currentProblemId.
    let transitioning = false;
    if (context.kind === 'curriculumItem') {
      const progress = await UserProgress.findOne({ userId, curriculumItemId: session.contextId });
      if (!progress?.currentProblemId) {
        transitioning = await classifyReadyForPractice(context, conversation);
      }
    }

    const { text, revealed } = await generateTutorReply(context, conversation, { isOpeningTurn: false, transitioning });

    // Attach BEFORE persisting anything: if this throws (generation
    // exhausted its retries — a real, if rare, failure mode), the whole turn
    // must fail cleanly with NOTHING written to the session. Persisting
    // first and attaching after would leave a "here it comes!" reply
    // permanently in the transcript on a failed attach — found live, this
    // corrupts the session's history for every later turn (the readiness
    // classifier reads recent turns to judge intent, and a transcript full
    // of unfulfilled "coming right up!" replies with no problem ever
    // attached confuses it on the next real attempt).
    let attachedProblem = null;
    if (transitioning) {
      const curriculumItem = await CurriculumItem.findById(session.contextId);
      if (curriculumItem) {
        attachedProblem = await attachNextProblem(userId, curriculumItem);
      }
    }

    session.messages.push({ role: 'user', content: body.message!, timestamp: new Date() });
    session.messages.push({ role: 'tutor', content: text, timestamp: new Date() });
    if (revealed) session.revealedSolution = true;
    await session.save();

    await touchTutorMemory(userId);

    if (attachedProblem) {
      res.status(201).json({ sessionId: session.id, reply: text, readyForPractice: true, problem: toClientProblem(attachedProblem) });
      captureMemoryInBackground(userId, context, body.message!, text);
      return;
    }

    res.status(201).json({ sessionId: session.id, reply: text });

    // Runs after the response is already sent — needs the FINAL accepted
    // reply, which the guardrail retry loop inside generateTutorReply may
    // have rewritten more than once before settling.
    captureMemoryInBackground(userId, context, body.message!, text);
  } catch (err) {
    next(err);
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

