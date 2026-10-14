import { Router } from 'express';
import { execute } from '../controllers/execute.controller';

const router = Router();

router.post('/execute', execute);

export default router;
