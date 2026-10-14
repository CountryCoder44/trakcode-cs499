import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import * as seq from '../controllers/seq.controller';

// Sequential Curriculum ("Learn by topic") — the hand-authored ordered
// pass/fail lesson package that makes up Learn Mode. Mounted at /api/seq in
// app.ts.
const router = Router();

router.get('/topics', requireAuth, seq.listTopics);
// Compact per-course completion summary — what a learner has finished, for
// gating Practice Mode to concepts they've actually learned.
router.get('/progress', requireAuth, seq.courseProgress);
router.get('/topics/:topicId', requireAuth, seq.getTopic);
router.post('/topics/:topicId/items/:itemId/submit', requireAuth, seq.submitItem);
router.post('/topics/:topicId/skip', requireAuth, seq.skipTopic);
router.post('/topics/:topicId/reset', requireAuth, seq.resetTopic);

export default router;
