// One-off cleanup: the `mern` stack was renamed to `typescript` and its
// content dropped (see CLAUDE.md). This removes any rows in a persistent dev
// DB still tagged `stack: 'mern'`, plus the rows that only existed to
// reference them, so nothing orphaned resurfaces against the new enum.
//
// Run this with the dev server STOPPED — connectDB() spins its own
// mongodb-memory-server against the same persistent dbPath, and two of them
// fight over the WiredTiger lock (see CLAUDE.md's admin-dashboard note).
//
//   npm run purge:legacy-mern -w server
//
// Safe to run more than once; a clean DB just reports all-zeros.
import { connectDB, disconnectDB } from '../config/db';
import { CurriculumItem } from '../models/CurriculumItem';
import { Problem } from '../models/Problem';
import { Submission } from '../models/Submission';
import { UserProgress } from '../models/UserProgress';
import { UserProblemHistory } from '../models/UserProblemHistory';
import { TutorSession } from '../models/TutorSession';
import { TutorMemory } from '../models/TutorMemory';

const LEGACY_STACK = 'mern';

async function main() {
  await connectDB();

  const curriculumItemIds = (await CurriculumItem.find({ stack: LEGACY_STACK }).select('_id')).map((d) => d._id);
  const problemIds = (await Problem.find({ stack: LEGACY_STACK }).select('_id')).map((d) => d._id);

  const results = {
    curriculumItems: (await CurriculumItem.deleteMany({ stack: LEGACY_STACK })).deletedCount,
    problems: (await Problem.deleteMany({ stack: LEGACY_STACK })).deletedCount,
    userProgress: (await UserProgress.deleteMany({ curriculumItemId: { $in: curriculumItemIds } })).deletedCount,
    submissions: (await Submission.deleteMany({ problemId: { $in: problemIds } })).deletedCount,
    userProblemHistory: (await UserProblemHistory.deleteMany({ problemId: { $in: problemIds } })).deletedCount,
    tutorSessions: (
      await TutorSession.deleteMany({
        $or: [
          { contextType: 'curriculumItem', contextId: { $in: curriculumItemIds } },
          { contextType: 'problem', contextId: { $in: problemIds } },
        ],
      })
    ).deletedCount,
    tutorMemoriesTouched: (
      await TutorMemory.updateMany(
        { 'topicSkills.stack': LEGACY_STACK },
        { $pull: { topicSkills: { stack: LEGACY_STACK } } }
      )
    ).modifiedCount,
  };

  // eslint-disable-next-line no-console
  console.log('✅ Legacy "mern" data purged:', results);
  await disconnectDB();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('❌ Failed to purge legacy mern data:', err);
  process.exit(1);
});
