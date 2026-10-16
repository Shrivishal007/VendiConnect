/**
 * routes/residentRoutes.js
 */

import express from 'express';
import { registerResident, loginResident, getAllResidents } from '../controllers/residentController.js';

const router = express.Router();

// POST /api/residents/register
router.post('/register', registerResident);

// POST /api/residents/login
router.post('/login', loginResident);

// GET /api/residents (admin)
router.get('/', getAllResidents);

export default router;
