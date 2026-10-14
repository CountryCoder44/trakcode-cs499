import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import * as billingController from '../controllers/billing.controller';

// Normal JSON-bodied billing routes. The webhook route is wired separately
// in app.ts with express.raw() (Stripe signature verification needs the raw
// body) and mounted BEFORE the global express.json() middleware.
const router = Router();

router.post('/checkout-session', requireAuth, billingController.createCheckoutSession);
router.get('/status', requireAuth, billingController.getBillingStatus);
router.post('/cancel', requireAuth, billingController.cancelSubscription);

export default router;
