/**
 * utils/haversine.js
 * -----------------------------------------------------------------------
 * Great-circle distance (Haversine formula) and walking-ETA helpers used
 * by the proximity engine. Pure functions, no DB/Express dependencies,
 * so they're trivially unit-testable.
 * -----------------------------------------------------------------------
 */

const EARTH_RADIUS_KM = 6371; // Mean Earth radius

// Fallback walking speed if not configured via env. 3-4 km/h is the
// typical average human walking pace; 3.5 km/h is the midpoint.
const DEFAULT_WALKING_SPEED_KMH = parseFloat(process.env.WALKING_SPEED_KMH) || 3.5;

/**
 * Converts degrees to radians.
 * @param {number} degrees
 * @returns {number} radians
 */
function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Computes the great-circle (straight-line) distance between two
 * lat/lng points using the Haversine formula.
 *
 * @param {number} lat1 Latitude of point A (decimal degrees)
 * @param {number} lon1 Longitude of point A (decimal degrees)
 * @param {number} lat2 Latitude of point B (decimal degrees)
 * @param {number} lon2 Longitude of point B (decimal degrees)
 * @returns {number} distance in kilometers
 */
function calculateHaversineDistanceKm(lat1, lon1, lat2, lon2) {
  [lat1, lon1, lat2, lon2].forEach((coord) => {
    if (typeof coord !== 'number' || Number.isNaN(coord)) {
      throw new TypeError('All coordinates must be valid numbers');
    }
  });

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const rLat1 = toRadians(lat1);
  const rLat2 = toRadians(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * Converts a distance in km to an estimated walking time in minutes,
 * given a walking speed in km/h.
 *
 * @param {number} distanceKm
 * @param {number} [walkingSpeedKmh=DEFAULT_WALKING_SPEED_KMH]
 * @returns {number} ETA in minutes, rounded to the nearest whole minute
 */
function distanceToEtaMinutes(distanceKm, walkingSpeedKmh = DEFAULT_WALKING_SPEED_KMH) {
  if (walkingSpeedKmh <= 0) {
    throw new RangeError('walkingSpeedKmh must be greater than 0');
  }

  const hours = distanceKm / walkingSpeedKmh;
  const minutes = hours * 60;

  // Minimum of 1 minute displayed so a very-nearby vendor doesn't show "0 min"
  return Math.max(1, Math.round(minutes));
}

/**
 * Convenience wrapper: given two points, returns both distance and ETA
 * in one call - this is the shape most controllers will actually want.
 *
 * @param {{lat: number, lng: number}} pointA
 * @param {{lat: number, lng: number}} pointB
 * @param {number} [walkingSpeedKmh]
 * @returns {{ distanceKm: number, etaMinutes: number }}
 */
function getDistanceAndEta(pointA, pointB, walkingSpeedKmh = DEFAULT_WALKING_SPEED_KMH) {
  const distanceKm = calculateHaversineDistanceKm(pointA.lat, pointA.lng, pointB.lat, pointB.lng);
  const etaMinutes = distanceToEtaMinutes(distanceKm, walkingSpeedKmh);

  return {
    distanceKm: Math.round(distanceKm * 1000) / 1000, // keep 3 decimal places (~meter precision)
    etaMinutes,
  };
}

export { calculateHaversineDistanceKm, distanceToEtaMinutes, getDistanceAndEta };
