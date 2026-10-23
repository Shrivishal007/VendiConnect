import { backendClient } from './backendClient.js';

export const botBrain = {
  /**
   * Process incoming WhatsApp messages by delegating to the backend bilingual state machine
   */
  async processIncomingMessage({ text = '', sender = '9876543210', location = null }) {
    return await backendClient.processBotMessage({ text, sender, location });
  },
};
