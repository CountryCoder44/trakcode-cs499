import { Types } from 'mongoose';
import { User } from '../models/User';
import { Submission } from '../models/Submission';
import { TutorSession } from '../models/TutorSession';
import { TutorMemory } from '../models/TutorMemory';
import { UserProblemHistory } from '../models/UserProblemHistory';
import { Notification } from '../models/Notification';
import { OAuthLinkTicket } from '../models/OAuthLinkTicket';
import { SkillRequest } from '../models/SkillRequest';
import { PasswordResetToken } from '../models/PasswordResetToken';
import { UsageEvent } from '../models/UsageEvent';
import { UserIp } from '../models/UserIp';
import { PracticeAttempt } from '../models/PracticeAttempt';
import { FeedbackThread } from '../models/FeedbackThread';
import { FeedbackScreenshot } from '../models/FeedbackScreenshot';
import { forfeitPacks } from './trakPacks.service';
import { PracticeGenerationJob } from '../models/PracticeGenerationJob';
import { countProgressForUsers, deleteProgressForUsers } from '../repositories/seqProgress.repository';

// Deletes the given (non-admin) users and everything that belongs to them.
// Used by account deletion (accountDeletion.service.ts).
//
// Deliberately KEPT:
//   - Admin users and all of their data.
//   - The shared problem bank, curriculum, demo codes, and roadmap requests
//     (only the deleted users' votes are removed from requests).
//   - SafetyIncident: Trak safety records are kept permanently, including
//     the IP addresses copied onto them (Privacy Policy).
//   - SubscriptionEvent: membership changes behind the Admin Growth numbers.
//   - AiUsageLog: API spend history for the Usage tab.

export interface DevResetCounts {
  users: number;
  submissions: number;
  tutorSessions: number;
  tutorMemories: number;
  seqProgress: number;
  problemHistory: number;
  notifications: number;
  linkTickets: number;
  roadmapVotesFrom: number; // roadmap requests that had at least one vote from these users
}

export async function deleteUsersAndData(ids: Types.ObjectId[]): Promise<DevResetCounts> {
  const byUser = { userId: { $in: ids } };

  // Dependent data first, the user documents last, so an interrupted run
  // leaves the users in place to retry against rather than orphaned rows.
  const counts: DevResetCounts = {
    users: 0,
    submissions: (await Submission.deleteMany(byUser)).deletedCount ?? 0,
    tutorSessions: (await TutorSession.deleteMany(byUser)).deletedCount ?? 0,
    tutorMemories: (await TutorMemory.deleteMany(byUser)).deletedCount ?? 0,
    seqProgress: await deleteProgressForUsers(ids),
    problemHistory: (await UserProblemHistory.deleteMany(byUser)).deletedCount ?? 0,
    notifications: (await Notification.deleteMany(byUser)).deletedCount ?? 0,
    linkTickets: (await OAuthLinkTicket.deleteMany(byUser)).deletedCount ?? 0,
    roadmapVotesFrom: (await SkillRequest.updateMany({ votes: { $in: ids } }, { $pull: { votes: { $in: ids } } }))
      .modifiedCount,
  };
  await PasswordResetToken.deleteMany(byUser);
  await UsageEvent.deleteMany(byUser);
  await UserIp.deleteMany(byUser);
  // Practice Mode: the learner's own attempts (their code, runs, notes) go; the
  // shared assignments they were working on stay in the library.
  await PracticeAttempt.deleteMany(byUser);
  // Feedback they sent (and any screenshots) and our replies to it.
  await FeedbackScreenshot.deleteMany(byUser);
  await FeedbackThread.deleteMany(byUser);
  // Pack purchases stay as payment records, but their unused questions end here.
  await forfeitPacks(ids);
  await PracticeGenerationJob.updateMany({ 'waiters.userId': { $in: ids } }, { $pull: { waiters: { userId: { $in: ids } } } });
  // Re-check the role in the delete itself, not just the id list.
  counts.users = (await User.deleteMany({ _id: { $in: ids }, role: { $ne: 'admin' } })).deletedCount ?? 0;
  return counts;
}
