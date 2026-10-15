import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

// Rate limiter for public endpoints (300 req/15min)
export const publicRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_PUBLIC, 10) || 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, try again later' },
});

// Rate limiter for admin login (10 req/15min)
export const adminLoginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_LOGIN, 10) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts, try again later' },
});

// Rate limiter for location updates (30 req/min per vendor)
export const locationIngestLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_LOCATION, 10) || 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.params.vendorId || ipKeyGenerator(req.ip),
  message: { success: false, message: 'Location updates are sent too frequently' },
});
