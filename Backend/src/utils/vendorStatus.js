const STALE_THRESHOLD_MINUTES = parseInt(process.env.STALE_SIGNAL_THRESHOLD_MINUTES, 10) || 5;

// Define possible vendor availability statuses
export const VENDOR_STATUS = {
  ACTIVE: 'ACTIVE',
  APPROACHING: 'APPROACHING',
  STALE_SIGNAL: 'STALE_SIGNAL',
  OFFLINE: 'OFFLINE',
};

// Determine vendor status based on activity, location freshness, and viewer proximity
export function computeVendorStatus(vendor, location, viewerContext = {}) {
  if (!vendor || vendor.Status !== 'ACTIVE' || !location) {
    return VENDOR_STATUS.OFFLINE;
  }

  // Mark vendors with outdated location signals as stale
  const ageMinutes = (Date.now() - new Date(location.UpdatedAt).getTime()) / (1000 * 60);
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
