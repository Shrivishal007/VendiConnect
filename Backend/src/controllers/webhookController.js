import VendorSession from '../models/VendorSession.js';
import { hashPhoneNumber } from '../utils/geoPrivacy.js';
import { ingestVendorLocation } from './locationController.js';
import { AppError } from '../utils/AppError.js';

export function verifyWebhookSubscription(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (!expectedToken) {
    console.error('[webhookController] WHATSAPP_WEBHOOK_VERIFY_TOKEN is not configured');
    return res.sendStatus(500);
  }

  if (mode === 'subscribe' && token === expectedToken) {
    console.log('[webhookController] Webhook subscription verified');
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
}

export async function receiveWhatsAppEvent(req, res) {
  try {
    const messages = extractMessages(req.body);

    res.status(200).json({ success: true });

    for (const message of messages) {
      await processMessage(message).catch((err) => {
        console.error('[webhookController] Failed to process message', message?.id, err);
      });
    }
  } catch (err) {
    console.error('[webhookController.receiveWhatsAppEvent]', err);
  }
}

function extractMessages(body) {
  try {
    return body?.entry?.[0]?.changes?.[0]?.value?.messages || [];
  } catch {
    return [];
  }
}

async function processMessage(message) {
  const rawPhone = message.from;
  if (!rawPhone) return;

  const whatsAppHash = hashPhoneNumber(rawPhone);
  const session = await VendorSession.findOne({ WhatsAppHash: whatsAppHash }).lean();

  if (!session) {
    console.warn(`[webhookController] No vendor session found for inbound message from hash ${whatsAppHash.slice(0, 8)}... - ignoring until vendor completes onboarding/consent`);
    return;
  }

  if (message.type === 'location' && message.location) {
    const { latitude, longitude } = message.location;
    try {
      await ingestVendorLocation(session.Vendor_ID, latitude, longitude);
    } catch (err) {
      if (err instanceof AppError) {
        console.warn(`[webhookController] Location ping rejected for vendor ${session.Vendor_ID}: ${err.message}`);
      } else {
        throw err;
      }
    }
    return;
  }

  if (message.type === 'text' && /^stop$/i.test(message.text?.body?.trim() || '')) {
    console.log(`[webhookController] STOP keyword received for vendor ${session.Vendor_ID} - hand off to consent withdrawal flow`);
  }
}
