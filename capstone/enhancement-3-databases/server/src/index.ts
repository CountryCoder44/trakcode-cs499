import { createApp } from './app';
import { connectDB, disconnectDB } from './config/db';
import { env } from './config/env';
import { seedCurriculumData } from './seeds/curriculum.seed';
import { seedSampleProblems } from './seeds/problems.seed';
import { importSeqCurriculum } from './seeds/seqCurriculum.import';

async function main() {
  await connectDB();

  // The in-memory dev DB (MONGODB_URI=memory://...) is ephemeral per process,
  // so re-seed reference data every boot — a persistent DB just gets a no-op
  // upsert. See seeds/curriculum.seed.ts and seeds/problems.seed.ts.
  if (env.MONGODB_URI.startsWith('memory://')) {
    await seedCurriculumData();
    await seedSampleProblems();
    // eslint-disable-next-line no-console
    console.log('🌱 Auto-seeded curriculum + sample problems for in-memory dev DB');
  }

  // Sequential Curriculum is imported from the `.md` source of truth every boot
  // (idempotent upsert) so edits under `Sequential Curriculum/` show up on a
  // server restart, same as the curriculum seed. A malformed topic file is
  // skipped with a warning, not fatal.
  await importSeqCurriculum().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Sequential Curriculum import failed:', err);
  });

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`🚀 TrakCode API listening on :${env.PORT} [${env.NODE_ENV}]`);
  });

  // Without this, `disconnectDB()` (which calls `memoryServer.stop()`) never
  // runs on a normal Ctrl+C / `tsx watch` reload — the spawned `mongod.exe`
  // child (memory:// dev mode) is orphaned instead of cleanly stopped, and
  // every dev-loop restart leaks one more zombie process + its temp/data
  // directory. Found via exactly that failure mode accumulating over time.
  let shuttingDown = false;
  async function shutdown(signal: NodeJS.Signals) {
    if (shuttingDown) return;
    shuttingDown = true;
    // eslint-disable-next-line no-console
    console.log(`\n${signal} received, shutting down gracefully...`);
    server.close();
    await disconnectDB();
    process.exit(0);
  }
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal startup error:', err);
  process.exit(1);
});
