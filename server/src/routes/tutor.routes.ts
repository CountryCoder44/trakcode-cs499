import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import * as tutorController from '../controllers/tutor.controller';

const router = Router();

router.post('/message', requireAuth, tutorController.sendMessage);
router.get('/session/:id', requireAuth, tutorController.getSession);
router.get('/seq-item/session', requireAuth, tutorController.getLatestSeqItemSession);

export default router;
