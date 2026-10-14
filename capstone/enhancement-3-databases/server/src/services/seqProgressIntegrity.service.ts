import { SeqTopic, flattenItems } from '../models/SeqTopic';
import { findAllDistinctProgressKeys } from '../repositories/seqProgress.repository';

// Module 2 code review, databases finding: "progress rows can survive
// curriculum content re-imports with no referential-integrity check."
// seqCurriculum.import.ts does a wholesale `lessons`/`checkpoint` field
// REPLACEMENT on every topic, keyed by a stable `topicId`, and runs
// unconditionally on every server boot — nothing in that path ever looks at
// SeqProgress. Renaming or removing an itemId in source content (or deleting
// a topic file outright, leaving its `SeqTopic` row untouched since the
// importer only ever upserts, never deletes) silently strands any
// `SeqProgress` row that already referenced it: the row keeps counting
// toward a user's `attempts`/pass history forever, but can never again be
// resolved back to a real item by anything that walks live topic content
// (`flattenItems`, the controller's gating math, Trak's tutor context).
// There is no DB-enforced foreign key here — `topicId`/`itemId` are free
// strings — so this is the only way to detect the drift.

export interface OrphanedProgressRow {
  _id: unknown;
  topicId: string;
  itemId: string;
  // 'unknown-topic': the topicId itself no longer resolves to any SeqTopic
  // (a topic file was deleted/renamed outright — rare, but distinct from an
  // item-level rename since there's no live topic to blame the mismatch on).
  // 'unknown-item': the topic still exists, but this itemId isn't among its
  // current flattened items (the far more common case — a single lesson
  // item was renamed or removed within an otherwise-unchanged topic).
  reason: 'unknown-topic' | 'unknown-item';
}

// Read-only: walks every currently-live topic's content once, builds the
// set of itemIds each topicId can legitimately reference today, and returns
// every SeqProgress row (as its {_id, topicId, itemId} key only) that no
// longer resolves. Never mutates anything — callers decide what, if
// anything, to do with the result.
export async function findOrphanedProgressRows(): Promise<OrphanedProgressRow[]> {
  const topics = await SeqTopic.find({});
  const validItemIdsByTopic = new Map<string, Set<string>>();
  for (const topic of topics) {
    validItemIdsByTopic.set(topic.topicId, new Set(flattenItems(topic).map(({ item }) => item.itemId)));
  }

  const keys = await findAllDistinctProgressKeys();
  const orphans: OrphanedProgressRow[] = [];
  for (const { _id, topicId, itemId } of keys) {
    const validItemIds = validItemIdsByTopic.get(topicId);
    if (!validItemIds) {
      orphans.push({ _id, topicId, itemId, reason: 'unknown-topic' });
    } else if (!validItemIds.has(itemId)) {
      orphans.push({ _id, topicId, itemId, reason: 'unknown-item' });
    }
  }
  return orphans;
}
