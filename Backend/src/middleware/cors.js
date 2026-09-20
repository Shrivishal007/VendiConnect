import cors from 'cors';

const defaultOrigins = ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8081'];

function parseAllowedOrigins() {
  const input = process.env.ALLOWED_ORIGINS;
  if (!input) {
    return defaultOrigins;
  }

  return input
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const allowedOrigins = parseAllowedOrigins();

const corsMiddleware = cors({
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn(`[CORS] Blocked request from disallowed origin: ${origin}`);
    return callback(new Error('Not allowed by CORS policy'));
  },
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400,
});

export default corsMiddleware;
