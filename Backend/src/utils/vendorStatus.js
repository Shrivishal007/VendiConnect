const STALE_THRESHOLD_MINUTES = parseInt(process.env.STALE_SIGNAL_THRESHOLD_MINUTES, 10) || 5;

export const VENDOR_STATUS = {
  ACTIVE: 'ACTIVE',
  APPROACHING: 'APPROACHING',
  STALE_SIGNAL: 'STALE_SIGNAL',
  OFFLINE: 'OFFLINE',
};

export function computeVendorStatus(vendor, location, viewerContext = {}) {
  if (!vendor || vendor.Status !== 'ACTIVE' || !location) {
    return VENDOR_STATUS.OFFLINE;
  }

  const ageMinutes = (Date.now() - new Date(location.UpdatedAt).getTime()) / (1000 * 60);
  if (ageMinutes > STALE_THRESHOLD_MINUTES) {
    return VENDOR_STATUS.STALE_SIGNAL;
  }

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
