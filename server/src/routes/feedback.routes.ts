import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { feedbackLimiter } from '../middleware/rateLimit.middleware';
import * as feedbackController from '../controllers/feedback.controller';

// Feedback button + the learner's Messages inbox. Open to every signed-in
// account (no subscription needed), so anyone can report a problem.
const router = Router();

router.post('/', requireAuth, feedbackLimiter, feedbackController.submitFeedback);
router.get('/threads', requireAuth, feedbackController.listMyThreads);
router.get('/unread', requireAuth, feedbackController.getMyUnread);
router.get('/threads/:id', requireAuth, feedbackController.getMyThread);
router.get('/threads/:id/screenshot', requireAuth, feedbackController.getMyScreenshot);

export default router;
