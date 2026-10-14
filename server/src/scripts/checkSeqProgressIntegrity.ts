// Reports (and optionally cleans up) SeqProgress rows orphaned by a
// curriculum content re-import — see seqProgressIntegrity.service.ts for why
// this can happen. Read-only by default; nothing is deleted unless --delete
// is passed explicitly.
//
// Run this with the dev server STOPPED — connectDB() spins its own
// mongodb-memory-server against the same persistent dbPath, and two of them
// fight over the WiredTiger lock.
//
//   npm run check:seq-progress-integrity -w server            (report only)
//   npm run check:seq-progress-integrity -w server -- --delete (report + delete)
//
// Safe to run more than once; a clean DB just reports zero orphans.
import { connectDB, disconnectDB } from '../config/db';
import { findOrphanedProgressRows, OrphanedProgressRow } from '../services/seqProgressIntegrity.service';
import { deleteProgressRowsByIds } from '../repositories/seqProgress.repository';

async function main() {
  const shouldDelete = process.argv.slice(2).includes('--delete');

  await connectDB();

  const orphans = await findOrphanedProgressRows();

  if (orphans.length === 0) {
    // eslint-disable-next-line no-console
    console.log('✅ No orphaned SeqProgress rows found — every row resolves to a real, currently-live item.');
    await disconnectDB();
    return;
  }

  const byReason: Record<OrphanedProgressRow['reason'], number> = { 'unknown-topic': 0, 'unknown-item': 0 };
  for (const o of orphans) byReason[o.reason]++;

  // eslint-disable-next-line no-console
  console.log(`⚠️  Found ${orphans.length} orphaned SeqProgress row(s):`);
  // eslint-disable-next-line no-console
  console.log(`   ${byReason['unknown-topic']} referencing a topic that no longer exists`);
  // eslint-disable-next-line no-console
  console.log(`   ${byReason['unknown-item']} referencing an item removed/renamed within an existing topic`);
  for (const o of orphans) {
    // eslint-disable-next-line no-console
    console.log(`   - [${o.reason}] topicId=${o.topicId} itemId=${o.itemId} (_id=${o._id})`);
  }

  if (shouldDelete) {
    const deletedCount = await deleteProgressRowsByIds(orphans.map((o) => o._id));
    // eslint-disable-next-line no-console
    console.log(`🗑️  Deleted ${deletedCount} orphaned row(s).`);
  } else {
    // eslint-disable-next-line no-console
    console.log('Run again with --delete to remove these rows. No changes made.');
  }

  await disconnectDB();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('❌ Failed to check SeqProgress integrity:', err);
  process.exit(1);
});
