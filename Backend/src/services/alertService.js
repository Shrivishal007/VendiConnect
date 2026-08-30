import Alert from '../models/Alert.js';

const ALERT_THROTTLE_MINUTES = parseInt(process.env.ALERT_THROTTLE_MINUTES, 10) || 45;

export async function isAlertAllowed(vendorId, residentId) {
  const throttleWindowStart = new Date(Date.now() - ALERT_THROTTLE_MINUTES * 60 * 1000);

  const recentAlert = await Alert.findOne({
    Vendor_ID: vendorId,
    Resident_ID: residentId,
    Timestamp: { $gte: throttleWindowStart },
  })
    .sort({ Timestamp: -1 })
    .lean();

  return !recentAlert;
}

export async function recordAlert(vendorId, residentId, etaMinutes, distanceKm) {
  return Alert.create({
    Vendor_ID: vendorId,
    Resident_ID: residentId,
    Timestamp: new Date(),
    EtaMinutes: etaMinutes,
    DistanceAtAlert: distanceKm,
  });
}

export async function checkAndThrottleAlert(vendorId, residentId, etaMinutes, distanceKm) {
  const allowed = await isAlertAllowed(vendorId, residentId);

  if (!allowed) {
    return { allowed: false, alert: null };
  }

  const alert = await recordAlert(vendorId, residentId, etaMinutes, distanceKm);
  return { allowed: true, alert };
}
