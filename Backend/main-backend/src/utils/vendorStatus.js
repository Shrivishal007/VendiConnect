import { requiredPositiveInteger } from '../config/env.js';

const STALE_THRESHOLD_MINUTES = requiredPositiveInteger('STALE_SIGNAL_THRESHOLD_MINUTES');

// Define possible vendor availability statuses
export const VENDOR_STATUS = {
  ACTIVE: 'ACTIVE',
  APPROACHING: 'APPROACHING',
  STALE_SIGNAL: 'STALE_SIGNAL',
  OFFLINE: 'OFFLINE',
};

// Determine vendor status based on activity, location freshness, and viewer proximity
export function computeVendorStatus(vendor, location, viewerContext = {}, consentActive = true) {
  if (!vendor || vendor.Status !== 'ACTIVE' || !location || !consentActive) {
    return VENDOR_STATUS.OFFLINE;
  }

  // If location has expired according to its expiration timestamp
  if (location.ExpiresAt && new Date(location.ExpiresAt).getTime() <= Date.now()) {
    return VENDOR_STATUS.OFFLINE;
  }

  // Mark vendors with outdated location signals as stale
  const lastUpdate = location.UpdatedAt ? new Date(location.UpdatedAt).getTime() : 0;
  const ageMinutes = (Date.now() - lastUpdate) / (1000 * 60);
  if (ageMinutes > STALE_THRESHOLD_MINUTES) {
    return VENDOR_STATUS.STALE_SIGNAL;
  }

  // Check whether the vendor is within the viewer's notification radius
  const { distanceMeters, notificationRadiusMeters } = viewerContext;
  if (
    typeof distanceMeters === 'number' &&
    typeof notificationRadiusMeters === 'number' &&
    distanceMeters <= notificationRadiusMeters
  ) {
    return VENDOR_STATUS.APPROACHING;
  }

  return VENDOR_STATUS.ACTIVE;
}
