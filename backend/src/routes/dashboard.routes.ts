import { Router } from 'express';
import { getSummary } from '../controllers/dashboard.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
router.get('/summary', authenticate, getSummary);

export default router;
