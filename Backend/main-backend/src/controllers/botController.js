import { botService } from '../services/botService.js';

export async function handleBotMessage(req, res) {
  try {
    const { text, sender, location } = req.body || {};

    if (!sender) {
      return res.status(400).json({ success: false, message: 'sender (phone number) is required' });
    }

    const reply = await botService.processMessage({ text, sender, location });
    return res.status(200).json({ success: true, reply });
  } catch (err) {
    console.error('[botController.handleBotMessage]', err);
    return res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
}

export async function handleResetBotSession(req, res) {
  try {
    const { phone } = req.body || {};
    if (!phone) {
      return res.status(400).json({ success: false, message: 'phone is required' });
    }

    await botService.resetSession(phone);
    return res.status(200).json({ success: true, message: 'Bot session reset successfully' });
  } catch (err) {
    console.error('[botController.handleResetBotSession]', err);
    return res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
}
