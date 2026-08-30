import express from 'express';
import { login, getDashboard } from '../controllers/adminController.js';
import { getPilotReport } from '../controllers/pilotController.js';
import { requireAdminAuth } from '../middleware/authMiddleware.js';
import { adminLoginLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/login', adminLoginLimiter, login);

router.get('/dashboard', requireAdminAuth, getDashboard);

router.get('/pilot-report', requireAdminAuth, getPilotReport);

export default router;
