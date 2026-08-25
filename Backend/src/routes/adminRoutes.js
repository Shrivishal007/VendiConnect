/**
 * routes/adminRoutes.js  *** NEW THIS WEEK ***
 * -----------------------------------------------------------------------
 */

import express from 'express';
import { login, getDashboard } from '../controllers/adminController.js';
import { requireAdminAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/admin/login - public
router.post('/login', login);

// GET /api/admin/dashboard - protected, requires a valid JWT
router.get('/dashboard', requireAdminAuth, getDashboard);

export default router;
