/**
 * routes/alertRoutes.js
 * -----------------------------------------------------------------------
 * Manual/admin alert-testing endpoint. See controllers/alertController.js.
 * -----------------------------------------------------------------------
 */

import express from 'express';
import { createAlert } from '../controllers/alertController.js';

const router = express.Router();

router.post('/', createAlert);

export default router;
