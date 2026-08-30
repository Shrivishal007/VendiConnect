import crypto from 'crypto';

const DECIMAL_PRECISION = 3;

export function approximateCoordinates(latitude, longitude) {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    throw new TypeError('approximateCoordinates expects numeric latitude and longitude');
  }
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    throw new RangeError('latitude/longitude must not be NaN');
  }
  if (latitude < -90 || latitude > 90) {
    throw new RangeError('latitude out of range (-90 to 90)');
  }
  if (longitude < -180 || longitude > 180) {
    throw new RangeError('longitude out of range (-180 to 180)');
  }

  const factor = 10 ** DECIMAL_PRECISION;
  const truncate = (value) => Math.trunc(value * factor) / factor;

  return {
    latitude: truncate(latitude),
    longitude: truncate(longitude),
  };
}

export function toApproximateGeoPoint(latitude, longitude) {
  const approx = approximateCoordinates(latitude, longitude);
  return {
    type: 'Point',
    coordinates: [approx.longitude, approx.latitude],
  };
}

export function hashPhoneNumber(rawPhoneNumber) {
  if (!rawPhoneNumber || typeof rawPhoneNumber !== 'string') {
    throw new TypeError('hashPhoneNumber expects a non-empty string');
  }

  const secret = process.env.PHONE_HASH_SECRET;
  if (!secret) {
    throw new Error('PHONE_HASH_SECRET is not defined in environment variables');
  }

  const normalized = normalizePhoneNumber(rawPhoneNumber);
  return crypto.createHmac('sha256', secret).update(normalized).digest('hex');
}

export function normalizePhoneNumber(phone) {
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith('+');
  const digitsOnly = trimmed.replace(/\D/g, '');
  return hasPlus ? `+${digitsOnly}` : digitsOnly;
}

export function maskPhoneNumber(rawPhoneNumber) {
  const normalized = normalizePhoneNumber(rawPhoneNumber);
  if (normalized.length <= 4) return '*'.repeat(normalized.length);

  const visibleStart = normalized.slice(0, 4);
  const visibleEnd = normalized.slice(-2);
  const maskedMiddle = '*'.repeat(Math.max(normalized.length - 6, 0));

  return `${visibleStart}${maskedMiddle}${visibleEnd}`;
}
