import { Problem } from '../models/Problem';
import { CurriculumItem } from '../models/CurriculumItem';
import { Submission } from '../models/Submission';
import { UserProgress } from '../models/UserProgress';
import { TutorContextType } from '../models/TutorSession';
import { TutorMemory, TopicSkillLevel } from '../models/TutorMemory';
import { Stack, ExecutionLanguage } from '../types/domain';
import { stackToLanguage } from './executionClient';
import { getCompletedTopics, CompletedTopic } from './curriculumPractice.service';

// A trimmed read of Trak's cross-session memory, shaped for the system
// prompt — see server/src/models/TutorMemory.ts for the persisted shape.
export interface TutorMemorySnapshot {
  goals: string;
  personalNotes: string;
  topicSkills: { topic: string; stack?: Stack; level: TopicSkillLevel; note?: string }[];
  daysSinceLastInteraction: number | null; // null = first-ever interaction with Trak
}

// A live-computed "is the learner stuck" signal — no new TutorSession field
// needed, all three facts are derivable from data that already exists.
export interface StuckSignal {
  messageCount: number;
  minutesSinceSessionStart: number;
  hasSucceededSinceSessionStart: boolean;
}

export interface TutorContext {
  kind: TutorContextType;
  // Threaded through purely for AI-usage logging (aiUsage.service.ts) — see
  // tutor.service.ts's four call sites. Not used for any behavioral logic.
  userId: string;
  title: string;
  content: string; // problem prompt or lesson markdown
  stack?: Stack;
  // The learner's current, unsaved editor buffer as of this exact chat
  // message — distinct from latestSubmissionCode below (their last
  // *submitted* solution, sourced from the DB). Context-kind-agnostic: set
  // for both `problem` and `curriculumItem` sessions alike.
  liveEditorCode?: string;
  latestSubmissionCode?: string;
  latestSubmissionResult?: string;
  progressSummary: string;
  problemTestCases?: { input: string; expectedOutput: string }[];
  problemLanguage?: ExecutionLanguage;
  // curriculumItem-only — how many of the 5 required questions this learner
  // has passed unaided so far. Undefined for `problem` context. This is what
  // tells buildSystemPrompt which round's framing to use (full concept intro
  // vs. a short check-in vs. a bonus-round framing) — see
  // curriculumPractice.service.ts for how it's incremented.
  unaidedPassCount?: number;
  // Topics in this stack this learner has actually completed (UserProgress,
  // not curriculum position) — set for both `problem` and `curriculumItem`
  // context. Gives Trak's own conversation real, grounded knowledge of what
  // it's safe to assume the learner already knows, distinct from (and a
  // firmer source of truth than) TutorMemory's conversationally-inferred
  // topicSkills. See curriculumPractice.service.ts's getCompletedTopics.
  completedTopics?: CompletedTopic[];
  memory: TutorMemorySnapshot;
  stuckSignal: StuckSignal;
}

async function getProgressSummary(userId: string, stack?: Stack): Promise<string> {
  const items = await CurriculumItem.find(stack ? { stack } : {}).select('_id');
  const itemIds = items.map((i) => i._id);
  const progress = await UserProgress.find({ userId, curriculumItemId: { $in: itemIds } });
  const complete = progress.filter((p) => p.status === 'complete').length;
  const inProgress = progress.filter((p) => p.status === 'in_progress').length;

  return stack
    ? `${complete}/${items.length} ${stack} curriculum items complete, ${inProgress} in progress.`
    : `${complete} curriculum items complete across all stacks, ${inProgress} in progress.`;
}

// Read-only — the extraction call in tutor.service.ts (via the controller)
// owns writes. Global per user, so no contextType/contextId filtering.
async function getMemorySnapshot(userId: string): Promise<TutorMemorySnapshot> {
  const memoryDoc = await TutorMemory.findOne({ userId });
  return {
    goals: memoryDoc?.goals ?? '',
    personalNotes: memoryDoc?.personalNotes ?? '',
    topicSkills: (memoryDoc?.topicSkills ?? []).map((t) => ({
      topic: t.topic,
      stack: t.stack,
      level: t.level,
      note: t.note,
    })),
    daysSinceLastInteraction: memoryDoc
      ? Math.floor((Date.now() - memoryDoc.lastInteractionAt.getTime()) / 86_400_000)
      : null,
  };
}

// "Has the learner succeeded at the thing they're working on since this chat
// session started" — the closest live signal to "made progress," used
// alongside message count/elapsed time to inform (not trigger) Trak's read
// on whether the learner seems stuck. No new TutorSession field needed.
async function hasSucceededSince(
  userId: string,
  contextType: TutorContextType,
  contextId: string,
  since: Date
): Promise<boolean> {
  if (contextType === 'problem') {
    const passed = await Submission.exists({ userId, problemId: contextId, result: 'pass', submittedAt: { $gte: since } });
    return !!passed;
  }
  const completed = await UserProgress.exists({
    userId,
    curriculumItemId: contextId,
    status: 'complete',
    completedAt: { $gte: since },
  });
  return !!completed;
}

// Spec §6: "Context assembled per message: user's current problem/curriculum
// item, their latest code submission (if any), and their curriculum progress
// — passed into the LLM call as system context, not stored per-message."
export async function buildTutorContext(
  userId: string,
  contextType: TutorContextType,
  contextId: string,
  liveEditorCode: string | undefined,
  session: { createdAt: Date; messageCount: number }
): Promise<TutorContext> {
  const [memory, hasSucceeded] = await Promise.all([
    getMemorySnapshot(userId),
    hasSucceededSince(userId, contextType, contextId, session.createdAt),
  ]);
  const stuckSignal: StuckSignal = {
    messageCount: session.messageCount,
    minutesSinceSessionStart: (Date.now() - session.createdAt.getTime()) / 60_000,
    hasSucceededSinceSessionStart: hasSucceeded,
  };

  if (contextType === 'problem') {
    const problem = await Problem.findById(contextId);
    if (!problem) throw new Error('Problem not found for this tutor session');

    const [latestSubmission, completedTopics] = await Promise.all([
      Submission.findOne({ userId, problemId: problem._id }).sort({ submittedAt: -1 }),
      getCompletedTopics(userId, problem.stack),
    ]);

    return {
      kind: 'problem',
      userId,
      title: `${problem.topic} (${problem.difficulty})`,
      content: problem.prompt,
      stack: problem.stack,
      liveEditorCode,
      latestSubmissionCode: latestSubmission?.code,
      latestSubmissionResult: latestSubmission?.result,
      progressSummary: await getProgressSummary(userId, problem.stack),
      problemTestCases: problem.testCases,
      problemLanguage: stackToLanguage[problem.stack],
      completedTopics,
      memory,
      stuckSignal,
    };
  }

  const item = await CurriculumItem.findById(contextId);
  if (!item) throw new Error('Curriculum item not found for this tutor session');

  const [progress, completedTopics] = await Promise.all([
    UserProgress.findOne({ userId, curriculumItemId: item._id }).select('unaidedPassCount'),
    getCompletedTopics(userId, item.stack, item.id),
  ]);

  return {
    kind: 'curriculumItem',
    userId,
    title: item.title,
    content: item.lessonContent,
    stack: item.stack,
    liveEditorCode,
    progressSummary: await getProgressSummary(userId, item.stack),
    unaidedPassCount: progress?.unaidedPassCount ?? 0,
    completedTopics,
    memory,
    stuckSignal,
  };
}
