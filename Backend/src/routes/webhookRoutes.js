import express from 'express';
import { verifyWebhookSubscription, receiveWhatsAppEvent } from '../controllers/webhookController.js';
import { webhookIdempotency } from '../middleware/webhookIdempotency.js';

const router = express.Router();

router.get('/whatsapp', verifyWebhookSubscription);

router.post('/whatsapp', webhookIdempotency, receiveWhatsAppEvent);

export default router;
