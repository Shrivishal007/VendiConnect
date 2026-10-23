import 'dotenv/config';
import { requiredEnv } from '../config/env.js';

const BACKEND_URL = requiredEnv('BACKEND_API_URL').replace(/\/$/, '');

export const backendClient = {
  // Process incoming WhatsApp message through backend bilingual bot engine
  async processBotMessage({ text, sender, location }) {
    try {
      const res = await fetch(`${BACKEND_URL}/vendors/bot/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, sender, location }),
      });
      const data = await res.json();
      return data.reply || data.message || 'No reply from server';
    } catch (err) {
      console.error('[backendClient.processBotMessage]', err.message);
      return '⚠️ Service temporarily unavailable. Please try again shortly / சேவை தற்காலிகமாக கிடைக்கவில்லை.';
    }
  },

  // Reset bot session state in backend
  async resetBotSession(phone) {
    const response = await fetch(`${BACKEND_URL}/vendors/bot/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || `Session reset failed with status ${response.status}`);
    }
    return result;
  },
};
