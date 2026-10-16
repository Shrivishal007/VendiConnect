/**
 * routes/alertRoutes.js
 * -----------------------------------------------------------------------
 * Routes for alerts: list all alerts (Admin), create doorbell alert (Resident),
 * and throttle check.
 * -----------------------------------------------------------------------
 */

import express from 'express';
import { getAllAlerts, createDoorbellAlert, createAlert } from '../controllers/alertController.js';

const router = express.Router();

// GET /api/alerts - List all alerts for Admin Dashboard
router.get('/', getAllAlerts);

// POST /api/alerts - Create doorbell stop alert
router.post('/', createDoorbellAlert);

// POST /api/alerts/throttle-check - Legacy throttle check
router.post('/throttle-check', createAlert);

export default router;
