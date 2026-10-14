import { RequestHandler } from 'express';
import { z } from 'zod';
import { CurriculumItem } from '../models/CurriculumItem';
import { UserProgress, ProgressStatus } from '../models/UserProgress';
import { Problem } from '../models/Problem';
import { TutorSession } from '../models/TutorSession';
import { toClientProblem } from '../services/problemBank.service';
import { resolveCalibrationSessionId } from '../services/curriculumPractice.service';

// ---- GET /curriculum?stack=python ----
const listQuerySchema = z.object({
  stack: z.enum(['python', 'mern', 'cpp']),
});

export const listCurriculum: RequestHandler = async (req, res, next) => {
  try {
    const { stack } = listQuerySchema.parse(req.query);

    const items = await CurriculumItem.find({ stack }).sort({ order: 1 });
    const progress = await UserProgress.find({
      userId: req.auth!.userId,
      curriculumItemId: { $in: items.map((i) => i._id) },
    });
    const statusByItemId = new Map(progress.map((p) => [p.curriculumItemId.toString(), p.status]));

    // Screen 5: "checklist tree (locked/unlocked by prerequisites)" — compute
    // lock state server-side so every client renders the same tree consistently.
    const tree = items.map((item) => {
      const prereqIds = item.prerequisites.map((id) => id.toString());
      const locked = prereqIds.some((id) => statusByItemId.get(id) !== 'complete');
      return {
        id: item.id,
        title: item.title,
        description: item.description,
        level: item.level,
        prerequisites: prereqIds,
        order: item.order,
        status: (statusByItemId.get(item.id) ?? 'not_started') as ProgressStatus,
        locked,
      };
    });

    res.json({ stack, items: tree });
  } catch (err) {
    handleCurriculumError(err, res, next);
  }
};

// ---- GET /curriculum/:id ----
export const getCurriculumItem: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.auth!.userId;
    const item = await CurriculumItem.findById(req.params.id);
    if (!item) {
      res.status(404).json({ error: 'Curriculum item not found' });
      return;
    }

    // Viewing a lesson starts it — never downgrade an already-complete item.
    let progress = await UserProgress.findOne({ userId, curriculumItemId: item._id });
    if (!progress) {
      progress = await UserProgress.create({ userId, curriculumItemId: item._id, status: 'in_progress' });
    } else if (progress.status === 'not_started') {
      progress.status = 'in_progress';
      await progress.save();
    }

    // Learn Mode redesign: phase is derived from whether a problem is
    // currently attached, never stored separately — see UserProgress.ts.
    const phase: 'calibrating' | 'practicing' = progress.currentProblemId ? 'practicing' : 'calibrating';

    let currentProblem = null;
    let resumeSessionId: string | null = null;

    if (phase === 'practicing' && progress.currentProblemId) {
      const problem = await Problem.findById(progress.currentProblemId);
      currentProblem = problem ? toClientProblem(problem) : null;
      const problemSession = await TutorSession.findOne({
        userId,
        contextType: 'problem',
        contextId: progress.currentProblemId,
      })
        .sort({ createdAt: -1 })
        .select('_id');
      resumeSessionId = problemSession ? problemSession.id : null;
    } else {
      resumeSessionId = await resolveCalibrationSessionId(userId, item.id);
    }

    res.json({
      item: {
        id: item.id,
        stack: item.stack,
        title: item.title,
        description: item.description,
        level: item.level,
        prerequisites: item.prerequisites.map((p) => p.toString()),
        lessonContent: item.lessonContent,
        order: item.order,
        topic: item.topic,
      },
      learnerState: {
        status: progress.status,
        unaidedPassCount: progress.unaidedPassCount,
        phase,
        currentProblem,
        hasPriorSession: resumeSessionId !== null,
        resumeSessionId,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ---- POST /curriculum/:id/reset-progress ----
export const resetProgress: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.auth!.userId;
    const item = await CurriculumItem.findById(req.params.id);
    if (!item) {
      res.status(404).json({ error: 'Curriculum item not found' });
      return;
    }

    const progress = await UserProgress.findOneAndUpdate(
      { userId, curriculumItemId: item._id },
      { $set: { status: 'not_started', unaidedPassCount: 0 }, $unset: { currentProblemId: '' } },
      { upsert: true, new: true }
    );

    // The one deliberate exception to "leave old stuff as backup" in this
    // codebase: leaving these in place would let the very next GET
    // /curriculum/:id resolve resumeSessionId to the stale, pre-reset
    // calibration transcript and silently resurrect it as "resumable" —
    // directly contradicting "back to 0/5" from a full reset.
    await TutorSession.deleteMany({ userId, contextType: 'curriculumItem', contextId: item._id });

    res.json({ progress: { curriculumItemId: item.id, status: progress.status, unaidedPassCount: progress.unaidedPassCount } });
  } catch (err) {
    next(err);
  }
};

// ---- GET /progress?stack=python ----
export const getProgress: RequestHandler = async (req, res, next) => {
  try {
    const { stack } = listQuerySchema.parse(req.query);

    const items = await CurriculumItem.find({ stack }).select('_id');
    const progress = await UserProgress.find({
      userId: req.auth!.userId,
      curriculumItemId: { $in: items.map((i) => i._id) },
    });

    res.json({
      stack,
      progress: progress.map((p) => ({
        curriculumItemId: p.curriculumItemId.toString(),
        status: p.status,
        completedAt: p.completedAt ?? null,
      })),
    });
  } catch (err) {
    handleCurriculumError(err, res, next);
  }
};

function handleCurriculumError(err: unknown, res: Parameters<RequestHandler>[1], next: Parameters<RequestHandler>[2]) {
  if (err instanceof z.ZodError) {
    res.status(400).json({ error: 'Validation failed', details: err.flatten().fieldErrors });
    return;
  }
  // Mirrors the AI_API_KEY-unset pattern used elsewhere (e.g.
  // handlePracticeError/handleTutorError) — the sandbox being unreachable or
  // unconfigured is a deployment/config issue, not a client error.
  if (err instanceof Error && (err.message.includes('EXECUTION_SERVICE_URL') || err.message.includes('Execution sandbox returned'))) {
    res.status(503).json({ error: err.message });
    return;
  }
  next(err);
}
