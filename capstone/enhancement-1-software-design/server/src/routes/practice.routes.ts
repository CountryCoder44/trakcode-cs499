import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import * as practiceController from '../controllers/practice.controller';

const router = Router();

// Spec §7 "Practice Mode" — none marked public, all require JWT.
router.post('/deep-dive/request', requireAuth, practiceController.requestDeepDive);
router.post('/flash-card/request', requireAuth, practiceController.requestFlashCard);
router.get('/problem/:id', requireAuth, practiceController.getProblem);
router.post('/submit', requireAuth, practiceController.submit);
router.get('/history', requireAuth, practiceController.getHistory);

export default router;
