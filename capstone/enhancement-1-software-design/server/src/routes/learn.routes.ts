import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import * as curriculumController from '../controllers/curriculum.controller';

// Spec §7 "Learn Mode" — routes are flat (/curriculum, /progress), not nested
// under a shared prefix, so this router mounts at the /api root in app.ts.
const router = Router();

router.get('/curriculum', requireAuth, curriculumController.listCurriculum);
router.get('/curriculum/:id', requireAuth, curriculumController.getCurriculumItem);
router.post('/curriculum/:id/reset-progress', requireAuth, curriculumController.resetProgress);
router.get('/progress', requireAuth, curriculumController.getProgress);

export default router;
