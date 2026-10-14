import { IProblem } from '../models/Problem';
import { CurriculumItem, CurriculumLevel, ICurriculumItem } from '../models/CurriculumItem';
import { UserProgress } from '../models/UserProgress';
import { TutorSession } from '../models/TutorSession';
import { Difficulty } from '../models/Problem';
import { Stack } from '../types/domain';
import { findOrGenerateProblem } from './problemBank.service';

// Owns every piece of the Learn Mode <-> Practice Mode coupling the redesigned
// lesson flow needs, so it lives in exactly one place rather than sprawling
// across tutor.controller.ts / practice.controller.ts / curriculum.controller.ts.
// See the "Learn Mode redesign" plan for the full design rationale.

const LEVEL_TO_DIFFICULTY: Record<CurriculumLevel, Difficulty> = {
  intro: 'easy',
  intermediate: 'medium',
  advanced: 'hard',
};

// The most recent curriculumItem-context TutorSession for this (user, item) —
// one continuous session spans the whole lesson attempt (every calibration
// round, from the first intro through however many bonus rounds), so "the
// most recent one" is really "the only one that matters" outside of a reset.
export async function resolveCalibrationSessionId(
  userId: string,
  curriculumItemId: string
): Promise<string | null> {
  const session = await TutorSession.findOne({ userId, contextType: 'curriculumItem', contextId: curriculumItemId })
    .sort({ createdAt: -1 })
    .select('_id');
  return session ? session.id : null;
}

export interface CompletedTopic {
  title: string;
  description: string;
}

// The real, per-user source of truth for "what does this learner actually
// already know in this stack" — deliberately NOT derived from curriculum
// `order` (a learner can reach a lesson without having completed what
// structurally precedes it; GET /curriculum/:id never checks `locked`, only
// the tree view does — see LearnTreePage.tsx). Used both to scope
// AI-generated practice questions (buildScopeHint, below) and to give
// Trak's own conversational context genuine awareness of completed topics
// (tutorContext.service.ts), rather than assuming from curriculum position.
export async function getCompletedTopics(
  userId: string,
  stack: Stack,
  excludeItemId?: string
): Promise<CompletedTopic[]> {
  const completed = await UserProgress.find({ userId, status: 'complete' }).select('curriculumItemId');
  const completedIds = completed.map((p) => p.curriculumItemId);
  const items = await CurriculumItem.find({ stack, _id: { $in: completedIds } })
    .sort({ order: 1 })
    .select('title description');
  return items.filter((i) => i.id !== excludeItemId).map((i) => ({ title: i.title, description: i.description }));
}

// Builds the constraint fed to problemGeneration.service.ts's buildPrompt —
// cumulative "what's already completed" plus the full detail of the lesson
// actually being tested, so a generated problem can't require anything this
// specific learner hasn't actually been taught yet. Capped defensively
// (not load-bearing today — even a 6-item stack's full hint is well under
// 1500 chars — but costs nothing and bounds things if lesson content grows).
async function buildScopeHint(userId: string, curriculumItem: ICurriculumItem): Promise<string> {
  const completedTopics = await getCompletedTopics(userId, curriculumItem.stack, curriculumItem.id);
  const lines = completedTopics.map((t) => `- ${t.title} (already completed by this learner): ${t.description}`);
  lines.push(`- ${curriculumItem.title} (the current lesson being tested — full detail below):\n${curriculumItem.lessonContent}`);
  const hint = lines.join('\n\n');
  return hint.length > 4000 ? hint.slice(0, 4000) + '…' : hint;
}

// Bank-first-or-generate a problem on this lesson's topic (full reuse of the
// existing pipeline — no curriculum-specific problem-serving logic needed),
// scoped to what this learner has actually completed so far, and attach it
// as the learner's current round. Called from exactly one place:
// tutor.controller.ts's ready-classifier branch, once per round, whether
// that's round 2, round 5, or an uncapped bonus round.
export async function attachNextProblem(userId: string, curriculumItem: ICurriculumItem): Promise<IProblem> {
  const scopeHint = await buildScopeHint(userId, curriculumItem);
  const problem = await findOrGenerateProblem({
    userId,
    stack: curriculumItem.stack,
    topic: curriculumItem.topic,
    difficulty: LEVEL_TO_DIFFICULTY[curriculumItem.level],
    type: 'deep_dive',
    scopeHint,
  });

  await UserProgress.findOneAndUpdate(
    { userId, curriculumItemId: curriculumItem._id },
    { $set: { currentProblemId: problem._id }, $setOnInsert: { status: 'in_progress' } },
    { upsert: true, setDefaultsOnInsert: true }
  );

  return problem;
}

export interface CurriculumAdvanceResult {
  curriculumItemId: string;
  unaidedPassCount: number;
  lessonJustCompleted: boolean;
  resumeSessionId: string;
}

// Called by practice.controller.ts's submit handler after every `pass`.
// Returns null when this pass doesn't count toward any lesson at all (no
// topic match, a stray/unrelated Practice Mode submission that happens to
// share a topic, a solution that was revealed, or a resubmit of an
// already-passed problem) — the caller only needs to surface
// `curriculumAdvance` in its response when this returns non-null.
export async function recordUnaidedPassIfApplicable(
  userId: string,
  problem: IProblem,
  opts: { solvedWithHelp: boolean; isFirstPass: boolean }
): Promise<CurriculumAdvanceResult | null> {
  if (opts.solvedWithHelp || !opts.isFirstPass) return null;

  // Reverse (stack, topic) -> curriculum item lookup. Requires topic strings
  // to be unique within a stack — true by construction of the seed data.
  const item = await CurriculumItem.findOne({ stack: problem.stack, topic: problem.topic });
  if (!item) return null;

  const progress = await UserProgress.findOne({ userId, curriculumItemId: item._id });
  // Guards against an unrelated Practice Mode submission that happens to
  // share a topic string, and incidentally guards against double-counting
  // from a multi-tab race (the first tab's pass already clears currentProblemId).
  if (!progress || progress.currentProblemId?.toString() !== problem.id) return null;

  progress.currentProblemId = undefined;
  let lessonJustCompleted = false;
  if (progress.unaidedPassCount < 5) {
    progress.unaidedPassCount += 1;
    if (progress.unaidedPassCount === 5) {
      progress.status = 'complete';
      progress.completedAt = new Date();
      lessonJustCompleted = true;
    }
  }
  // Past 5 (a bonus-round pass): counter and status are left untouched —
  // pinned, not incremented further.
  await progress.save();

  const resumeSessionId = await resolveCalibrationSessionId(userId, item.id);
  if (!resumeSessionId) {
    // Shouldn't happen — a curriculum session must already exist for a
    // problem to have been attached in the first place — but fail closed
    // rather than return a result the client can't act on.
    return null;
  }

  return {
    curriculumItemId: item.id,
    unaidedPassCount: progress.unaidedPassCount,
    lessonJustCompleted,
    resumeSessionId,
  };
}
