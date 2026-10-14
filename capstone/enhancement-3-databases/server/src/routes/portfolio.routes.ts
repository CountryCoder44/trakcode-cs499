import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import * as portfolioController from '../controllers/portfolio.controller';

const router = Router();

router.post('/push', requireAuth, portfolioController.pushToPortfolio);
router.get('/', requireAuth, portfolioController.listPortfolio);

export default router;
