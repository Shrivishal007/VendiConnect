import cors from 'cors';

const DEFAULT_DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
];

function parseAllowedOrigins() {
  const raw = process.env.ALLOWED_ORIGINS;
  if (!raw) return DEFAULT_DEV_ORIGINS;

  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const allowedOrigins = parseAllowedOrigins();
const allowPreviewDeploys = process.env.ALLOW_PREVIEW_DEPLOYS === 'true';
const previewHostPatterns = [/\.vercel\.app$/, /\.netlify\.app$/];

function isOriginAllowed(origin) {
  if (allowedOrigins.includes(origin)) return true;

  if (allowPreviewDeploys) {
    try {
      const { hostname } = new URL(origin);
      return previewHostPatterns.some((pattern) => pattern.test(hostname));
    } catch {
      return false;
    }
  }

  return false;
}

export const corsMiddleware = cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);

    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }

    console.warn(`[cors] Blocked request from disallowed origin: ${origin}`);
    return callback(new Error('Not allowed by CORS policy'));
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400,
});
