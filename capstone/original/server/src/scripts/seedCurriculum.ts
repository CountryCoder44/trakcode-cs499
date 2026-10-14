// CLI wrapper for persistent databases (dev Atlas cluster, etc.). For local
// dev against the in-memory DB, the server auto-seeds this on boot instead —
// see index.ts — since each process gets its own ephemeral mongod.
import { connectDB, disconnectDB } from '../config/db';
import { seedCurriculumData } from '../seeds/curriculum.seed';

async function main() {
  await connectDB();
  await seedCurriculumData();
  // eslint-disable-next-line no-console
  console.log('✅ Curriculum seeded');
  await disconnectDB();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('❌ Failed to seed curriculum:', err);
  process.exit(1);
});
