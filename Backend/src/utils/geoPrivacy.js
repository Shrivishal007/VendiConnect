/**
 * utils/geoPrivacy.js
 * -----------------------------------------------------------------------
 * DPDPA 2023 compliance helpers.
 *
 * 1. approximateCoordinates(): fuzzes raw lat/lng down to a fixed decimal
 *    precision so stored vendor locations only ever resolve to a
 *    ~50-100m radius "block", never an exact pinpoint.
 *
 * 2. hashPhoneNumber(): one-way HMAC-SHA256 hash of phone numbers so raw
 *    numbers are never persisted in plaintext. Uses a server-side secret
 *    (PHONE_HASH_SECRET) as an HMAC key, which is safer than a bare
 *    SHA-256 hash because it can't be brute-forced via a rainbow table
 *    of common phone number formats without knowing the secret.
 *
 * Precision note (why 3 decimal places):
 *   Latitude degrees are ~111.32 km apart everywhere.
 *   Longitude degrees shrink with cos(latitude), but for India's latitude
 *   band (~8-35°N) 1 decimal degree of longitude is still ~85-110 km.
 *   Rounding both lat & lng to 3 decimal places gives a grid cell of
 *   roughly 111m x (85-110m) - comfortably inside the 50-100m target
 *   band without needing latitude-dependent math. If a tighter/looser
 *   radius is desired, adjust DECIMAL_PRECISION below:
 *     2 decimals  -> ~1.1 km  (too coarse)
 *     3 decimals  -> ~100m    (target - default)
 *     4 decimals  -> ~11m     (too precise)
 * -----------------------------------------------------------------------
 */

import crypto from 'crypto';

// 3 decimal places ≈ 111m latitude grid / ~85-110m longitude grid in India.
const DECIMAL_PRECISION = 3;

/**
 * Truncates (not rounds) raw GPS coordinates to DECIMAL_PRECISION decimal
 * places. Truncation is used instead of rounding so the same raw point
 * always maps to the same "grid cell" boundary consistently - rounding
 * can occasionally nudge a coordinate into a neighbouring cell depending
 * on floating point noise, which is undesirable for consistent grouping.
 *
 * @param {number} latitude  Raw latitude in decimal degrees
 * @param {number} longitude Raw longitude in decimal degrees
 * @returns {{ latitude: number, longitude: number }} Approximated coordinates
 */
function approximateCoordinates(latitude, longitude) {
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

  // Math.trunc-based truncation (toward zero) rather than Math.floor,
  // so negative coordinates (southern/western hemispheres) truncate
  // symmetrically instead of always rounding "down" in magnitude.
  const truncate = (value) => Math.trunc(value * factor) / factor;

  return {
    latitude: truncate(latitude),
    longitude: truncate(longitude),
  };
}

/**
 * Builds a GeoJSON Point from raw coordinates, applying privacy
 * truncation first. This is the shape Mongoose/MongoDB 2dsphere
 * indexes expect: { type: 'Point', coordinates: [lng, lat] }.
 * NOTE: GeoJSON order is [longitude, latitude] - NOT [lat, lng].
 *
 * @param {number} latitude
 * @param {number} longitude
 * @returns {{ type: 'Point', coordinates: [number, number] }}
 */
function toApproximateGeoPoint(latitude, longitude) {
  const approx = approximateCoordinates(latitude, longitude);
  return {
    type: 'Point',
    coordinates: [approx.longitude, approx.latitude],
  };
}

/**
 * One-way hash of a phone number using HMAC-SHA256 keyed with a server
 * secret. The same input phone number always produces the same hash
 * (needed so we can look up/dedupe vendors by phone), but the hash
 * cannot practically be reversed to recover the original number.
 *
 * Always normalize the phone number (strip spaces, ensure country code)
 * BEFORE hashing, otherwise "+919876543210" and "9876543210" would hash
 * differently and break lookups. A minimal normalizer is included below;
 * swap for a proper libphonenumber-based normalizer in production.
 *
 * @param {string} rawPhoneNumber e.g. "+91 98765 43210"
 * @returns {string} hex-encoded HMAC-SHA256 hash
 */
function hashPhoneNumber(rawPhoneNumber) {
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
 * leading '+'. Replace with libphonenumber-js in production for robust
 * international parsing.
 *
 * @param {string} phone
 * @returns {string}
 */
function normalizePhoneNumber(phone) {
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith('+');
  const digitsOnly = trimmed.replace(/\D/g, '');
  return hasPlus ? `+${digitsOnly}` : digitsOnly;
}

/**
 * Produces a display-safe masked version of a phone number for admin
 * dashboards, e.g. "+91 98765 43210" -> "+9198******10".
 * This is DIFFERENT from hashPhoneNumber: masking is for UI display,
 * hashing is for storage/lookup. Never store the masked string as the
 * source of truth - it's derived on the fly from a number you already
 * have authorized access to (e.g. right after OTP verification).
 *
 * @param {string} rawPhoneNumber
 * @returns {string} masked phone number
 */
function maskPhoneNumber(rawPhoneNumber) {
  const normalized = normalizePhoneNumber(rawPhoneNumber);
  if (normalized.length <= 4) return '*'.repeat(normalized.length);

  const visibleStart = normalized.slice(0, 4);
  const visibleEnd = normalized.slice(-2);
  const maskedMiddle = '*'.repeat(Math.max(normalized.length - 6, 0));

  return `${visibleStart}${maskedMiddle}${visibleEnd}`;
}

export { approximateCoordinates, toApproximateGeoPoint, hashPhoneNumber, maskPhoneNumber, normalizePhoneNumber };
