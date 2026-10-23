import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcodeTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';
import { botBrain } from './botBrain.js';
import { backendClient } from './backendClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getChromeExecutablePath() {
  if (process.env.CHROME_BIN && fs.existsSync(process.env.CHROME_BIN)) {
    return process.env.CHROME_BIN;
  }

  const candidatePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, 'Google\\Chrome\\Application\\chrome.exe')
      : null,
  ].filter(Boolean);

  for (const candidatePath of candidatePaths) {
    if (fs.existsSync(candidatePath)) return candidatePath;
  }

  return undefined;
}

function isHiTrigger(text) {
  if (typeof text !== 'string') return false;
  const normalized = text.normalize('NFKC').replace(/\p{Cf}/gu, '').trim();
  return /^hi$/i.test(normalized);
}

function isByeTrigger(text) {
  if (typeof text !== 'string') return false;
  const normalized = text.normalize('NFKC').replace(/\p{Cf}/gu, '').trim();
  return /^bye$/i.test(normalized);
}

function getMessageDedupeKey(message, chatId, text) {
  const serializedId = message.id?._serialized;
  if (typeof serializedId === 'string' && serializedId) return serializedId;

  const providerId = message.id?.id;
  if (typeof providerId === 'string' && providerId) return `${chatId}:${providerId}`;

  if (Number.isFinite(message.timestamp) && message.timestamp > 0) {
    const location = message.location;
    const contentKey =
      location && Number.isFinite(location.latitude) && Number.isFinite(location.longitude)
        ? `${location.latitude},${location.longitude}`
        : text;
    return `${chatId}:${message.timestamp}:${message.type}:${contentKey}`;
  }

  return null;
}

class ChromeWhatsAppService {
  constructor() {
    this.client = null;
    this.status = 'idle';
    this.qrRaw = null;
    this.qrDataUrl = null;
    this.userPhone = null;
    this.processedMessageIds = new Set();
    this.activeChats = new Set();
  }

  async init({ headless = true } = {}) {
    if (this.client && this.status !== 'disconnected') {
      console.log(`[Chrome WhatsApp] Client already in status: ${this.status}`);
      return;
    }

    this.status = 'initializing';
    const chromePath = getChromeExecutablePath();
    console.log(`[Chrome WhatsApp] Initializing with Chrome at: ${chromePath || 'Puppeteer Chromium'}`);

    const authDir = path.resolve(__dirname, '../../.wwebjs_auth');
    fs.mkdirSync(authDir, { recursive: true });

    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: authDir,
        // Give Chromium time to release profile databases during logout on Windows.
        rmMaxRetries: 30,
      }),
      puppeteer: {
        headless,
        executablePath: chromePath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
      },
    });

    this.client.on('qr', async (qr) => {
      this.status = 'qr_ready';
      this.qrRaw = qr;
      try {
        this.qrDataUrl = await QRCode.toDataURL(qr, { scale: 8, margin: 2 });
      } catch (err) {
        console.error('[Chrome WhatsApp] Failed to render QR to data URL:', err);
      }

      console.log('\n======================================================');
      console.log(' [WHATSAPP WEB QR CODE] Scan with your WhatsApp Mobile App:');
      console.log(' Open WhatsApp on phone -> Linked Devices -> Link a Device');
      console.log(' (Or view live QR code in browser at http://localhost:5001/qr)');
      console.log('======================================================\n');
      qrcodeTerminal.generate(qr, { small: true });
    });

    this.client.on('authenticated', () => {
      this.status = 'authenticated';
      this.qrRaw = null;
      this.qrDataUrl = null;
      console.log('[Chrome WhatsApp] Session authenticated successfully!');
    });

    this.client.on('ready', () => {
      this.status = 'ready';
      this.userPhone = this.client.info?.wid?.user || 'Connected';
      console.log(`[Chrome WhatsApp] Ready! Connected as +${this.userPhone}`);
      console.log('[Chrome WhatsApp] Direct chats start with "hi" and end with "bye".');
    });

    this.client.on('message', async (msg) => {
      const chatId = msg.from?.toLowerCase();
      if (
        msg.fromMe ||
        !chatId ||
        chatId === 'status@broadcast' ||
        chatId.endsWith('@g.us')
      ) {
        console.log(`[Chrome WhatsApp] Ignoring non-direct or outgoing message (${chatId || 'unknown chat'}).`);
        return;
      }

      const text = msg.body || '';
      const location = msg.location &&
        Number.isFinite(msg.location.latitude) &&
        Number.isFinite(msg.location.longitude)
        ? {
            latitude: msg.location.latitude,
            longitude: msg.location.longitude,
          }
        : null;
      const isHi = isHiTrigger(text);
      const isBye = isByeTrigger(text);
      console.log(
        `[Chrome WhatsApp] Direct inbound event: chat=${chatId}, type=${msg.type}, bodyLength=${text.length}, hasLocation=${Boolean(location)}, hiTrigger=${isHi}, byeTrigger=${isBye}.`
      );
      if (!this.activeChats.has(chatId) && !isHi) {
        console.log(
          `[Chrome WhatsApp] Ignoring direct message from ${msg.from}: send "hi" to start a conversation.`
        );
        return;
      }

      const messageId = getMessageDedupeKey(msg, chatId, text);
      if (!messageId) {
        console.warn(`[Chrome WhatsApp] Message ID unavailable for hi from ${msg.from}; processing without deduplication.`);
      }
      if (messageId && this.processedMessageIds.has(messageId)) {
        console.log(`[Chrome WhatsApp] Ignoring duplicate message event from ${msg.from}.`);
        return;
      }
      if (messageId) {
        this.processedMessageIds.add(messageId);
        if (this.processedMessageIds.size > 1000) {
          this.processedMessageIds.delete(this.processedMessageIds.values().next().value);
        }
      }

      try {
        if (this.status !== 'ready') {
          console.warn(`[Chrome WhatsApp] Received message from ${msg.from} while client status is ${this.status}.`);
        }

        const sender = msg.from.replace('@c.us', '');
        if (isBye) {
          await backendClient.resetBotSession(sender);
          const sentMessage = await this.client.sendMessage(msg.from, 'Goodbye! Send hi anytime to start again.');
          if (!sentMessage) throw new Error('WhatsApp did not send the goodbye message');
          this.activeChats.delete(chatId);
          console.log(`[Chrome WhatsApp] Conversation ended for ${sender}.`);
          return;
        }

        if (isHi) this.activeChats.add(chatId);
        console.log(`[Chrome WhatsApp] Processing ${isHi ? 'hi trigger' : 'conversation reply'} from ${sender}.`);

        const replyText = await botBrain.processIncomingMessage({ text, sender, location });
        if (replyText) {
          const sentMessage = await this.client.sendMessage(msg.from, replyText);
          if (sentMessage) {
            console.log(`[Chrome WhatsApp] Replied to ${sender}`);
          } else {
            console.error(`[Chrome WhatsApp] WhatsApp did not send a reply to ${sender}.`);
          }
        } else {
          console.warn(`[Chrome WhatsApp] No reply returned for hi from ${sender}.`);
        }
      } catch (err) {
        console.error('[Chrome WhatsApp Message Error]', err);
      }
    });

    this.client.on('auth_failure', (err) => {
      this.status = 'auth_failure';
      console.error('[Chrome WhatsApp] Authentication failure:', err);
    });

    this.client.on('disconnected', (reason) => {
      this.status = 'disconnected';
      this.userPhone = null;
      this.activeChats.clear();
      console.log('[Chrome WhatsApp] Client disconnected:', reason);
    });

    try {
      await this.client.initialize();
    } catch (err) {
      this.status = 'error';
      console.error('[Chrome WhatsApp Init Error]', err);
    }
  }

  getStatus() {
    return {
      status: this.status,
      qrRaw: this.qrRaw,
      qrDataUrl: this.qrDataUrl,
      userPhone: this.userPhone,
    };
  }

  async destroy() {
    if (!this.client) return;

    await this.client.destroy();
    this.client = null;
    this.status = 'disconnected';
    this.userPhone = null;
    this.activeChats.clear();
  }
}

export const chromeWhatsAppService = new ChromeWhatsAppService();
