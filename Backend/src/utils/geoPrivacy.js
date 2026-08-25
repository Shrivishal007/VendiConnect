/**
 * utils/geoPrivacy.js
 * -----------------------------------------------------------------------
 * DPDPA 2023 compliance helpers (unchanged from Weeks 1-2, ported to ESM).
 *
 * 1. approximateCoordinates(): truncates raw lat/lng to a fixed decimal
 *    precision so stored vendor locations only ever resolve to a
 *    ~50-100m radius "block", never an exact pinpoint.
 * 2. hashPhoneNumber(): one-way HMAC-SHA256 hash of phone numbers so raw
 *    numbers are never persisted in plaintext.
 * -----------------------------------------------------------------------
 */

import crypto from 'crypto';

// 3 decimal places ≈ 111m latitude grid / ~85-110m longitude grid in India.
const DECIMAL_PRECISION = 3;

/**
 * Truncates raw GPS coordinates to DECIMAL_PRECISION decimal places.
 * @param {number} latitude
 * @param {number} longitude
 * @returns {{ latitude: number, longitude: number }}
 */
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

/**
 * Builds a privacy-truncated GeoJSON Point: { type: 'Point', coordinates: [lng, lat] }.
 * @param {number} latitude
 * @param {number} longitude
 */
export function toApproximateGeoPoint(latitude, longitude) {
  const approx = approximateCoordinates(latitude, longitude);
  return {
    type: 'Point',
    coordinates: [approx.longitude, approx.latitude],
  };
}

/**
 * One-way HMAC-SHA256 hash of a phone number, keyed with a server secret.
 * @param {string} rawPhoneNumber
 * @returns {string} hex-encoded hash
 */
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

/**
 * Minimal phone normalizer: strips all non-digit characters except a
 * leading '+'. Swap for libphonenumber-js in production.
 * @param {string} phone
 */
export function normalizePhoneNumber(phone) {
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith('+');
  const digitsOnly = trimmed.replace(/\D/g, '');
  return hasPlus ? `+${digitsOnly}` : digitsOnly;
}

/**
 * Display-safe masked phone number for admin dashboards.
 * @param {string} rawPhoneNumber
 */
export function maskPhoneNumber(rawPhoneNumber) {
  const normalized = normalizePhoneNumber(rawPhoneNumber);
  if (normalized.length <= 4) return '*'.repeat(normalized.length);

  const visibleStart = normalized.slice(0, 4);
  const visibleEnd = normalized.slice(-2);
  const maskedMiddle = '*'.repeat(Math.max(normalized.length - 6, 0));

  return `${visibleStart}${maskedMiddle}${visibleEnd}`;
}
