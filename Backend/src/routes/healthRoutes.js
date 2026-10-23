import express from 'express';
import { getHealth } from '../controllers/healthController.js';

const router = express.Router();

// Health check endpoint for monitoring API availability
router.get('/', getHealth);

export default router;
