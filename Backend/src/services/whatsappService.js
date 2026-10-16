import axios from 'axios';

/**
 * services/whatsappService.js
 * -----------------------------------------------------------------------
 * Handles outgoing interactions with the WhatsApp Cloud API.
 * -----------------------------------------------------------------------
 */

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
  console.warn('WhatsApp environment variables (WHATSAPP_TOKEN, PHONE_NUMBER_ID) are not set. Outgoing messages will fail.');
}

const whatsappApi = axios.create({
  baseURL: `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}`,
  headers: {
    Authorization: `Bearer ${WHATSAPP_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

export const sendTextMessage = async (to, text) => {
  if (!WHATSAPP_TOKEN) return; // Prevent crash if not configured locally
  try {
    const response = await whatsappApi.post('/messages', {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    });
    return response.data;
  } catch (error) {
    console.error('[whatsappService.sendTextMessage] Error:', error.response?.data || error.message);
  }
};
