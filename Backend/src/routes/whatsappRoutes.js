import express from 'express';
import { verifyWebhook, handleIncomingMessage } from '../controllers/whatsappController.js';

const router = express.Router();

/**
 * routes/whatsappRoutes.js
 * -----------------------------------------------------------------------
 * REST routes for WhatsApp Cloud API Webhook Integration (Week 1 & 2).
 * Mounts at /api/whatsapp/webhook.
 * -----------------------------------------------------------------------
 */

// Week 1: GET endpoint for webhook verification
router.get('/webhook', verifyWebhook);

// Week 1 & 2: POST endpoint for receiving incoming messages (text & location)
router.post('/webhook', handleIncomingMessage);

export default router;
