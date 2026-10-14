import { SeqProgress, ISeqProgress } from '../models/SeqProgress';
import { ISeqTopic, SeqItem } from '../models/SeqTopic';

// Module 2 code review, databases finding: "duplicated query logic, no
// data-access layer" — the "which items has this user passed" query was
// independently reimplemented at nine call sites across four files
// (seq.controller.ts x4 reads + 3 writes, seqPracticeScope.service.ts,
// tutorContext.service.ts), each selecting slightly different fields and
// building its own reduction over the raw rows. This module is the single
// place `SeqProgress` is ever queried or written from anywhere else in the
// codebase — every one of those nine call sites now goes through one of the
// functions below instead of its own `SeqProgress.find(...)`.

export interface ProgressMaps {
  passed: Set<string>;
  skipped: Set<string>;
}

// The one row shape every reduction below actually needs — a subset every
// caller's own `.select(...)` already narrowed down to in slightly
// different ways; centralizing the shape here is what let those different
// field lists collapse into one.
interface ProgressRow {
  itemId: string;
  passedAt?: Date;
  skipped?: boolean;
}

function toProgressMaps(rows: ProgressRow[]): ProgressMaps {
  const passed = new Set(rows.filter((r) => r.passedAt).map((r) => r.itemId));
  const skipped = new Set(rows.filter((r) => r.passedAt && r.skipped).map((r) => r.itemId));
  return { passed, skipped };
}

/**
 * Every progress row a user has across an entire course (every topic in
 * it), reduced to passed/skipped item-id sets. Replaces the duplicated
 * `{userId, course}` query previously in `seq.controller.ts`'s `listTopics`
 * and `progressForCourse`, and `seqPracticeScope.service.ts`'s
 * `getCompletedTopicNumbers`.
 */
export async function getProgressMapsByCourse(userId: string, course: string): Promise<ProgressMaps> {
  const rows = await SeqProgress.find({ userId, course }).select('itemId passedAt skipped');
  return toProgressMaps(rows);
}

/**
 * Every progress row a user has within one topic, reduced to passed/skipped
 * item-id sets, plus the raw rows themselves — `submitItem` needs the raw
 * rows too (to look up whether the item being submitted already has a prior
 * `passedAt`, so a re-pass never moves an earlier pass time backward).
 * Replaces the duplicated `{userId, topicId}` query previously in
 * `seq.controller.ts`'s `getTopic` and `submitItem`.
 */
export async function getProgressByTopic(
  userId: string,
  topicId: string
): Promise<ProgressMaps & { rows: ProgressRow[] }> {
  const rows = await SeqProgress.find({ userId, topicId }).select('itemId passedAt skipped');
  return { ...toProgressMaps(rows), rows };
}

/**
 * How many items in one topic a user has passed — just a count, no set
 * construction needed. Replaces `tutorContext.service.ts`'s own inline
 * `.filter((p) => p.passedAt).length` over a separately-fetched row set.
 */
export async function getCompletedItemCountByTopic(userId: string, topicId: string): Promise<number> {
  return SeqProgress.countDocuments({ userId, topicId, passedAt: { $exists: true } });
}

/**
 * Records one graded attempt at an item: increments the attempt counter,
 * stamps the concept-item's last submitted choice if applicable, and sets
 * `passedAt` on a pass — never moving an already-set `passedAt` backward
 * (a later re-pass of an already-passed item keeps the ORIGINAL pass time).
 * Replaces `seq.controller.ts`'s `submitItem` write.
 */
export async function recordAttempt(params: {
  userId: string;
  item: SeqItem;
  topic: ISeqTopic;
  passed: boolean;
  existingPassedAt?: Date;
  submittedChoice?: string; // present only for a `kind: 'choice'` submission
}): Promise<void> {
  const { userId, item, topic, passed, existingPassedAt, submittedChoice } = params;
  const set: Record<string, unknown> = {};
  if (item.type === 'concept' && submittedChoice !== undefined) {
    set.lastChoice = submittedChoice.toUpperCase().replace(/\s/g, '');
  }
  if (passed) set.passedAt = existingPassedAt ?? new Date();

  await SeqProgress.findOneAndUpdate(
    { userId, itemId: item.itemId },
    {
      $inc: { attempts: 1 },
      $setOnInsert: { course: topic.course, topicId: topic.topicId },
      ...(Object.keys(set).length ? { $set: set } : {}),
    },
    { upsert: true }
  );
}

/**
 * Marks every item in a topic as complete via skip rather than an earned
 * pass. Replaces `seq.controller.ts`'s `skipTopic` write. Returns the
 * number of items marked.
 */
export async function markTopicSkipped(userId: string, topic: ISeqTopic, itemIds: string[]): Promise<number> {
  const now = new Date();
  await SeqProgress.bulkWrite(
    itemIds.map((itemId) => ({
      updateOne: {
        filter: { userId, itemId },
        update: {
          $setOnInsert: { course: topic.course, topicId: topic.topicId },
          $set: { passedAt: now, skipped: true },
        },
        upsert: true,
      },
    }))
  );
  return itemIds.length;
}

/**
 * Deletes every progress row a user has for one topic. Replaces
 * `seq.controller.ts`'s `resetTopic` write.
 */
export async function resetTopicProgress(userId: string, topicId: string): Promise<void> {
  await SeqProgress.deleteMany({ userId, topicId });
}

/**
 * Every distinct `{topicId, itemId}` pair currently referenced by ANY
 * user's progress rows, across the whole `seqProgress` collection — used
 * only by the integrity-check script (`scripts/checkSeqProgressIntegrity.ts`)
 * to find rows whose item no longer exists in the current curriculum
 * content, not by any request-handling code path. Exported here rather than
 * having the script query `SeqProgress` directly, so this repository stays
 * the single place that model is ever touched from anywhere in the codebase.
 */
export async function findAllDistinctProgressKeys(): Promise<{ topicId: string; itemId: string; _id: unknown }[]> {
  return SeqProgress.find({}).select('topicId itemId').lean();
}

/** Deletes specific progress rows by id — used only by the integrity-check script's optional cleanup pass. */
export async function deleteProgressRowsByIds(ids: unknown[]): Promise<number> {
  const result = await SeqProgress.deleteMany({ _id: { $in: ids } });
  return result.deletedCount ?? 0;
}

/** Counts / deletes every progress row belonging to these users — used only by the dev test-user reset (`devReset.service.ts`). */
export async function countProgressForUsers(userIds: unknown[]): Promise<number> {
  return SeqProgress.countDocuments({ userId: { $in: userIds } });
}
export async function deleteProgressForUsers(userIds: unknown[]): Promise<number> {
  const result = await SeqProgress.deleteMany({ userId: { $in: userIds } });
  return result.deletedCount ?? 0;
}
