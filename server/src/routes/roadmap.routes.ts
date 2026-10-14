import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.middleware';
import * as roadmapController from '../controllers/roadmap.controller';

const router = Router();

router.get('/', optionalAuth, roadmapController.listRoadmap);
router.post('/request', requireAuth, roadmapController.createRequest);
router.post('/:id/vote', requireAuth, roadmapController.voteRequest);

export default router;
