import { Router } from 'express';
import { loginLimiter, signupLimiter } from '../middleware/rateLimit.middleware';
import * as authController from '../controllers/auth.controller';
import * as oauthController from '../controllers/oauth.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Spec §7 "Auth" table
router.post('/signup', signupLimiter, authController.signup);
router.post('/login', loginLimiter, authController.login);
router.post('/password/forgot', authController.forgotPassword);
router.post('/password/reset', authController.resetPasswordWithToken);
router.get('/me', requireAuth, authController.me);

// Social sign-in (Google / GitHub / LinkedIn) — see oauth.controller.ts.
// Replaces the original GitHub-only /github/login + /github/callback.
router.get('/providers', oauthController.listProviders);
router.get('/oauth/:provider/start', oauthController.start);
router.get('/oauth/:provider/callback', oauthController.callback);
router.post('/oauth/:provider/link', requireAuth, oauthController.createLinkTicket);
router.delete('/identities/:provider', requireAuth, oauthController.unlink);

export default router;
