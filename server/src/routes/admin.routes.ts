import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireAdminRole } from '../middleware/adminAuth.middleware';
import * as adminController from '../controllers/admin.controller';
import * as safetyController from '../controllers/safety.controller';
import * as feedbackController from '../controllers/feedback.controller';

const router = Router();

router.get('/problems/pending-review', requireAuth, requireAdminRole, adminController.listPendingReview);
router.put('/roadmap/:id/status', requireAuth, requireAdminRole, adminController.updateRoadmapStatus);
router.get('/usage/summary', requireAuth, requireAdminRole, adminController.getUsageSummary);
router.get('/usage/by-user', requireAuth, requireAdminRole, adminController.getUsageByUser);
router.get('/problems', requireAuth, requireAdminRole, adminController.listProblems);
router.get('/users', requireAuth, requireAdminRole, adminController.listUsers);
router.get('/founding-members', requireAuth, requireAdminRole, adminController.listFoundingMembers);
router.get('/users/:id/packs', requireAuth, requireAdminRole, adminController.listUserPacks);
router.post('/users/:id/free-access', requireAuth, requireAdminRole, adminController.setFreeAccess);
router.get('/safety/incidents', requireAuth, requireAdminRole, safetyController.listIncidents);
router.post('/safety/incidents/:id/review', requireAuth, requireAdminRole, safetyController.review);
router.post('/safety/incidents/:id/report', requireAuth, requireAdminRole, safetyController.report);
router.post('/safety/incidents/:id/hold', requireAuth, requireAdminRole, safetyController.hold);
router.get('/safety/users/:id/ips', requireAuth, requireAdminRole, safetyController.userIps);
router.get('/safety/users/:id/history', requireAuth, requireAdminRole, safetyController.userHistory);
router.post('/users/:id/standing', requireAuth, requireAdminRole, safetyController.setUserStanding);
router.get('/feedback', requireAuth, requireAdminRole, feedbackController.adminListFeedback);
router.get('/feedback/:id', requireAuth, requireAdminRole, feedbackController.adminGetFeedback);
router.get('/feedback/:id/screenshot', requireAuth, requireAdminRole, feedbackController.adminGetScreenshot);
router.post('/feedback/:id/reply', requireAuth, requireAdminRole, feedbackController.adminReply);
router.post('/feedback/:id/status', requireAuth, requireAdminRole, feedbackController.adminSetStatus);
router.get('/growth', requireAuth, requireAdminRole, adminController.getGrowth);
router.get('/practice/assignments', requireAuth, requireAdminRole, adminController.listPracticeAssignments);
router.get('/practice/metrics', requireAuth, requireAdminRole, adminController.getPracticeMetrics);
// Dev-only test-account wipe (403 outside NODE_ENV=dev).

export default router;
