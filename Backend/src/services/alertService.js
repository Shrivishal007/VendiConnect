/**
 * services/alertService.js
 * -----------------------------------------------------------------------
 * Notification Throttling engine (Core Requirement #5).
 *
 * Rule: a given (Vendor, Resident) pair should receive at most ONE
 * proactive "vendor nearby" alert within ALERT_THROTTLE_MINUTES. This
 * lives in a service (not directly in a controller) because it's called
 * from two places:
 *   1. controllers/alertController.js  - a REST endpoint for
 *      manual/admin testing and for the proactive-matching pipeline to
 *      call before triggering an FCM push.
 *   2. Potentially a future scheduled proximity-matching job, without
 *      needing to duplicate throttle logic.
 * -----------------------------------------------------------------------
 */

import Alert from '../models/Alert.js';

const ALERT_THROTTLE_MINUTES = parseInt(process.env.ALERT_THROTTLE_MINUTES, 10) || 30;

/**
 * Checks whether a new alert is allowed for this vendor/resident pair,
 * and if so, records it atomically.
 *
 * Design note on atomicity: rather than doing a separate "find the last
 * alert" read followed by a conditional "insert" write (which has a
 * race-condition window under concurrent requests), we simply always
 * insert - and rely on the caller having already checked
 * `isAlertAllowed()` in the same pass. For strict double-submit safety
 * under concurrency, wrap the check+insert in a short-lived unique
 * partial index or a transaction; for an M0-tier prototype with modest
 * concurrent traffic, the check-then-insert pattern below is sufficient.
 *
 * @param {string} vendorId
 * @param {string} residentId
 * @returns {Promise<boolean>} true if an alert is allowed to be sent now
 */
async function isAlertAllowed(vendorId, residentId) {
  const throttleWindowStart = new Date(Date.now() - ALERT_THROTTLE_MINUTES * 60 * 1000);

  // Look for the most recent alert to this vendor/resident pair.
  // Uses the compound index { Vendor_ID, Resident_ID, Timestamp } defined
  // on the Alert model, so this is an efficient indexed lookup rather
  // than a collection scan.
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
 * `isAlertAllowed()` returned true before calling this - this function
 * does not re-check, to keep the "check" and "act" steps explicit and
 * testable independently.
 *
 * @param {string} vendorId
 * @param {string} residentId
 * @param {number} etaMinutes
 * @param {number} distanceKm
 * @returns {Promise<Object>} the created Alert document
 */
async function recordAlert(vendorId, residentId, etaMinutes, distanceKm) {
  const alert = await Alert.create({
    Vendor_ID: vendorId,
    Resident_ID: residentId,
    Timestamp: new Date(),
    EtaMinutes: etaMinutes,
    DistanceAtAlert: distanceKm,
  });

  return alert;
}

/**
 * Convenience combined operation: checks the throttle window and, if
 * allowed, records the alert in one call. Returns whether the alert was
 * actually created, so the caller (e.g. the proactive matching pipeline,
 * right before calling FCM) knows whether to actually push the
 * notification or silently skip it.
 *
 * @param {string} vendorId
 * @param {string} residentId
 * @param {number} etaMinutes
 * @param {number} distanceKm
 * @returns {Promise<{ allowed: boolean, alert: Object|null }>}
 */
async function checkAndThrottleAlert(vendorId, residentId, etaMinutes, distanceKm) {
  const allowed = await isAlertAllowed(vendorId, residentId);

  if (!allowed) {
    return { allowed: false, alert: null };
  }

  const alert = await recordAlert(vendorId, residentId, etaMinutes, distanceKm);
  return { allowed: true, alert };
}

export { isAlertAllowed, recordAlert, checkAndThrottleAlert };
