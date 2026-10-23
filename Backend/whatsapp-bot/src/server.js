import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { botBrain } from './services/botBrain.js';
import { chromeWhatsAppService } from './services/chromeClient.js';
import { requiredBoolean, requiredEnv, requiredPort } from './config/env.js';

const app = express();
const port = requiredPort('PORT');
const nodeEnv = requiredEnv('NODE_ENV');
const autoStartClient = requiredBoolean('AUTO_START_CLIENT');
const headless = requiredBoolean('CHROME_HEADLESS');
const localOrigins = new Set([
  `http://localhost:${port}`,
  `http://127.0.0.1:${port}`,
  `http://[::1]:${port}`,
]);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function requireLocalSimulator(req, res, next) {
  if (nodeEnv === 'production') {
    return res.sendStatus(404);
  }

  const origin = req.get('origin');
  if (origin && !localOrigins.has(origin)) {
    return res.sendStatus(403);
  }

  const remoteAddress = req.socket.remoteAddress;
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remoteAddress)) {
    return res.sendStatus(403);
  }

  return next();
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. WhatsApp Web Simulator UI
app.get('/', requireLocalSimulator, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'simulator.html'));
});

// 2. WhatsApp Web Chrome Link / QR View
app.get('/qr', requireLocalSimulator, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'qr.html'));
});

// 3. Chrome WhatsApp Client Telemetry & Controls
app.get('/api/chrome/status', requireLocalSimulator, (req, res) => {
  res.json(chromeWhatsAppService.getStatus());
});

app.post('/api/chrome/start', requireLocalSimulator, async (req, res) => {
  try {
    const headless = req.body?.headless ?? true;
    // Asynchronously initialize without blocking HTTP response
    chromeWhatsAppService.init({ headless }).catch((err) => {
      console.error('[Chrome Start Error]', err);
    });
    return res.json({ success: true, message: 'Chrome client initialization started' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/chrome/stop', requireLocalSimulator, async (req, res) => {
  try {
    await chromeWhatsAppService.destroy();
    return res.json({ success: true, message: 'Chrome client stopped' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Direct Simulator API Endpoint
app.post('/api/simulate', requireLocalSimulator, async (req, res) => {
  try {
    const { text, sender = '9876543210', location } = req.body;
    const reply = await botBrain.processIncomingMessage({ text, sender, location });
    return res.json({ success: true, reply });
  } catch (err) {
    console.error('[Simulator Error]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Reset Simulator Session Endpoint
app.post('/api/simulate/reset', requireLocalSimulator, async (req, res) => {
  try {
    const { sender = '9876543210' } = req.body;
    const { backendClient } = await import('./services/backendClient.js');
    await backendClient.resetBotSession(sender);
    return res.json({ success: true, message: 'Session reset successfully' });
  } catch (err) {
    console.error('[Simulator Reset Error]', err);
    return res.status(500).json({ success: false, message: 'Unable to reset simulator session' });
  }
});

// Bot Service Health
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'VendiConnect WhatsApp Bot',
    port,
    status: 'online',
    timestamp: new Date().toISOString(),
  });
});

app.listen(port, () => {
  console.log(`[WhatsApp Bot] Listening on http://localhost:${port}`);
  console.log(`[WhatsApp Bot] Web Simulator running at http://localhost:${port}/`);
  console.log(`[WhatsApp Bot] Live QR Code for Phone Link at http://localhost:${port}/qr`);

  if (autoStartClient) {
    console.log('[WhatsApp Bot] Initializing WhatsApp Web Client for QR code phone linking...');
    chromeWhatsAppService.init({ headless }).catch((err) => {
      console.warn('[WhatsApp Bot] WhatsApp Web Client notice:', err.message);
    });
  }
});
