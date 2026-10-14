import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Spec §7 "Auth" table
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/demo-code/redeem', authController.redeemDemoCode);
router.get('/me', requireAuth, authController.me);
router.get('/github/callback', authController.githubCallback);

// Companion route (not itemized in §7, see comment in auth.controller.ts)
router.get('/github/login', authController.githubLogin);

export default router;
