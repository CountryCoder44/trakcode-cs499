import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireAdminKey, requireAdminRole } from '../middleware/adminAuth.middleware';
import * as adminController from '../controllers/admin.controller';

const router = Router();

router.post('/demo-codes', requireAdminKey, adminController.createDemoCode);
router.get('/problems/pending-review', requireAuth, requireAdminRole, adminController.listPendingReview);
router.put('/roadmap/:id/status', requireAuth, requireAdminRole, adminController.updateRoadmapStatus);
router.get('/usage/summary', requireAuth, requireAdminRole, adminController.getUsageSummary);
router.get('/usage/by-user', requireAuth, requireAdminRole, adminController.getUsageByUser);
router.get('/problems', requireAuth, requireAdminRole, adminController.listProblems);
router.get('/users', requireAuth, requireAdminRole, adminController.listUsers);

export default router;
