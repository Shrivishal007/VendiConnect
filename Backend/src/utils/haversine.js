const EARTH_RADIUS_KM = 6371;
const DEFAULT_WALKING_SPEED_KMH = parseFloat(process.env.WALKING_SPEED_KMH) || 3.5;

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

export function calculateHaversineDistanceKm(lat1, lon1, lat2, lon2) {
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

export function distanceToEtaMinutes(distanceKm, walkingSpeedKmh = DEFAULT_WALKING_SPEED_KMH) {
  if (walkingSpeedKmh <= 0) {
    throw new RangeError('walkingSpeedKmh must be greater than 0');
  }

  const minutes = (distanceKm / walkingSpeedKmh) * 60;
  return Math.max(1, Math.round(minutes));
}

export function getDistanceAndEta(pointA, pointB, walkingSpeedKmh = DEFAULT_WALKING_SPEED_KMH) {
  const distanceKm = calculateHaversineDistanceKm(pointA.lat, pointA.lng, pointB.lat, pointB.lng);
  const etaMinutes = distanceToEtaMinutes(distanceKm, walkingSpeedKmh);

  return {
    distanceKm: Math.round(distanceKm * 1000) / 1000,
    etaMinutes,
  };
}
