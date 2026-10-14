import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import * as practiceController from '../controllers/practice.controller';
import * as assignments from '../controllers/practiceAssignments.controller';

const router = Router();

// Spec §7 "Practice Mode" — none marked public, all require JWT.
router.post('/deep-dive/request', requireAuth, practiceController.requestDeepDive);
router.post('/flash-card/request', requireAuth, practiceController.requestFlashCard);
router.get('/problem/:id', requireAuth, practiceController.getProblem);
router.post('/submit', requireAuth, practiceController.submit);
router.get('/history', requireAuth, practiceController.getHistory);

// Long-form assignments: Practice the basics / Stretch out.
router.get('/catalog', requireAuth, assignments.getCatalog);
router.post('/assignments/start', requireAuth, assignments.startAssignment);
router.get('/library', requireAuth, assignments.getLibrary);
router.post('/library/:id/start', requireAuth, assignments.startLibrary);
router.get('/jobs/:jobId', requireAuth, assignments.getJob);
router.get('/attempts', requireAuth, assignments.getAttempts);
router.get('/attempts/:id', requireAuth, assignments.getAttempt);
router.put('/attempts/:id/code', requireAuth, assignments.putCode);
router.post('/attempts/:id/run', requireAuth, assignments.postRun);
router.post('/attempts/:id/abandon', requireAuth, assignments.postAbandon);
router.post('/attempts/:id/reopen', requireAuth, assignments.postReopen);
router.post('/attempts/:id/restart', requireAuth, assignments.postRestart);
router.post('/attempts/:id/replay', requireAuth, assignments.postReplay);
router.post('/attempts/:id/github', requireAuth, assignments.postGithub);

export default router;
