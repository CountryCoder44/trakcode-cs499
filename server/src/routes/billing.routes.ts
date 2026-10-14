import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import * as billingController from '../controllers/billing.controller';

// Normal JSON-bodied billing routes. The webhook route is wired separately
// in app.ts with express.raw() (Stripe signature verification needs the raw
// body) and mounted BEFORE the global express.json() middleware.
const router = Router();

router.get('/status', requireAuth, billingController.getBillingStatus);
// Public: when the founding-member period ends (Pricing page).
router.get('/founding', billingController.getFoundingPeriod);
router.post('/checkout-session', requireAuth, billingController.createCheckoutSession);
// Card changes, cancellation and invoices happen in Stripe's Customer Portal.
router.post('/portal-session', requireAuth, billingController.createPortalSession);
// Skip the rest of the free trial: bill now, full allowances now.
router.post('/start-membership', requireAuth, billingController.startMembershipNow);
// Capstone build: start the free trial without Stripe (the paywall bypass button).
router.post('/bypass-trial', requireAuth, billingController.startBypassTrial);
// Tutoring packs: extra Trak questions, one-time payment.
router.post('/trak-pack', requireAuth, billingController.createTrakPackCheckout);

export default router;
