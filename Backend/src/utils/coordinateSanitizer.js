import { calculateHaversineDistanceKm } from './haversine.js';

const MAX_PLAUSIBLE_SPEED_KMH = parseFloat(process.env.MAX_PLAUSIBLE_SPEED_KMH) || 25;

const NULL_ISLAND_EPSILON = 0.0005;

export function isStructurallyValidCoordinate(latitude, longitude) {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return { valid: false, reason: 'latitude/longitude must be numbers' };
  }

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { valid: false, reason: 'latitude/longitude must be finite (no NaN/Infinity)' };
  }

  if (latitude < -90 || latitude > 90) {
    return { valid: false, reason: 'latitude out of range (-90 to 90)' };
  }

  if (longitude < -180 || longitude > 180) {
    return { valid: false, reason: 'longitude out of range (-180 to 180)' };
  }

  if (Math.abs(latitude) < NULL_ISLAND_EPSILON && Math.abs(longitude) < NULL_ISLAND_EPSILON) {
    return { valid: false, reason: 'coordinate resolves to null island (0,0) - likely a parsing failure' };
  }

  return { valid: true };
}

export function isPlausibleMovement(previousPing, nextPing) {
  if (!previousPing) {
    return { valid: true };
  }

  const elapsedHours =
    (nextPing.timestamp.getTime() - previousPing.timestamp.getTime()) / (1000 * 60 * 60);

  if (elapsedHours <= 0) {
    return { valid: false, reason: 'non-increasing ping timestamp' };
  }

  const distanceKm = calculateHaversineDistanceKm(
    previousPing.latitude,
    previousPing.longitude,
    nextPing.latitude,
    nextPing.longitude
  );

  const impliedSpeedKmh = distanceKm / elapsedHours;

  if (impliedSpeedKmh > MAX_PLAUSIBLE_SPEED_KMH) {
    return {
      valid: false,
      reason: `implied speed ${impliedSpeedKmh.toFixed(1)} km/h exceeds plausible vendor movement (${MAX_PLAUSIBLE_SPEED_KMH} km/h)`,
      impliedSpeedKmh,
    };
  }

  return { valid: true, impliedSpeedKmh };
}

export function sanitizeIncomingPing({ latitude, longitude, previousPing = null, timestamp = new Date() }) {
  const structural = isStructurallyValidCoordinate(latitude, longitude);
  if (!structural.valid) {
    return structural;
  }

  if (previousPing) {
    const movement = isPlausibleMovement(previousPing, { latitude, longitude, timestamp });
    if (!movement.valid) {
      return movement;
    }
  }

  return { valid: true };
}
