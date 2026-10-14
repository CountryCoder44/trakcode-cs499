import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import * as profileController from '../controllers/profile.controller';

const router = Router();

// Static routes must be registered before the dynamic /:slug route below,
// or Express will match "settings"/"me" as a slug value.
router.put('/settings', requireAuth, profileController.updateProfileSettings);
router.get('/me/activity', requireAuth, profileController.getMyActivity);

// Public — no auth required.
router.get('/:slug', profileController.getPublicProfile);

export default router;
