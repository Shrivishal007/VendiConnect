/**
 * services/alertService.js
 * -----------------------------------------------------------------------
 * Notification Throttling engine. Rule: a given (Vendor, Resident) pair
 * should receive at most ONE proactive alert within ALERT_THROTTLE_MINUTES
 * (now 45 minutes per this week's spec - see .env.example).
 *
 * Ported to ESM. Called from services/proximityWorker.js on every
 * location-triggered match pass.
 * -----------------------------------------------------------------------
 */

import Alert from '../models/Alert.js';

const ALERT_THROTTLE_MINUTES = parseInt(process.env.ALERT_THROTTLE_MINUTES, 10) || 45;

/**
 * Checks whether a new alert is allowed for this vendor/resident pair.
 * @param {string} vendorId
 * @param {string} residentId
 * @returns {Promise<boolean>} true if no alert was sent within the throttle window
 */
export async function isAlertAllowed(vendorId, residentId) {
  const throttleWindowStart = new Date(Date.now() - ALERT_THROTTLE_MINUTES * 60 * 1000);

  // Hits the compound index { Vendor_ID, Resident_ID, Timestamp } on Alert.
  const recentAlert = await Alert.findOne({
    Vendor_ID: vendorId,
    Resident_ID: residentId,
    Timestamp: { $gte: throttleWindowStart },
  })
    .sort({ Timestamp: -1 })
    .lean();

  return !recentAlert;
}

/**
 * Records a new Alert document. Callers should have already confirmed
 * isAlertAllowed() returned true - kept as a separate step so
 * "check" and "act" remain independently testable.
 * @param {string} vendorId
 * @param {string} residentId
 * @param {number} etaMinutes
 * @param {number} distanceKm
 * @returns {Promise<Object>} created Alert document
 */
export async function recordAlert(vendorId, residentId, etaMinutes, distanceKm) {
  return Alert.create({
    Vendor_ID: vendorId,
    Resident_ID: residentId,
    Timestamp: new Date(),
    EtaMinutes: etaMinutes,
    DistanceAtAlert: distanceKm,
  });
}

/**
 * Combined check+record: throttle-checks and, if allowed, writes the
 * Alert in one call. Returns whether the alert was actually created so
 * the caller knows whether to proceed with the FCM push.
 * @param {string} vendorId
 * @param {string} residentId
 * @param {number} etaMinutes
 * @param {number} distanceKm
 * @returns {Promise<{ allowed: boolean, alert: Object|null }>}
 */
export async function checkAndThrottleAlert(vendorId, residentId, etaMinutes, distanceKm) {
  const allowed = await isAlertAllowed(vendorId, residentId);

  if (!allowed) {
    return { allowed: false, alert: null };
  }

  const alert = await recordAlert(vendorId, residentId, etaMinutes, distanceKm);
  return { allowed: true, alert };
}
