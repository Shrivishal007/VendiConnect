/**
 * services/activityLogService.js  *** NEW ***
 * -----------------------------------------------------------------------
 * Thin, deliberately-boring wrapper for writing to ActivityLog. Modeled
 * on the same "never throw, never block the caller's response" pattern
 * as services/fcmService.js - a logging failure should never be the
 * reason a real user-facing action (a location update, a rating) fails.
 *
 * Known Event values in use so far (kept as a comment, not an enum, so
 * this list can grow without a schema migration):
 *   - "Location Updated"   (locationController, matches slide 8's example row)
 *   - "Rating Received"    (ratingController)
 *   - "Consent Recorded"   (vendorSessionController)
 *   - "Session Status Changed" (vendorSessionController)
 * -----------------------------------------------------------------------
 */

import ActivityLog from '../models/ActivityLog.js';

/**
 * Writes one ActivityLog entry. Swallows and logs errors rather than
 * throwing, since callers use this fire-and-forget after their own
 * primary write has already succeeded.
 * @param {string} vendorId
 * @param {string} event Short event name, e.g. "Location Updated"
 * @param {string} [description] Optional human-readable detail
 * @returns {Promise<Object|null>} the created log doc, or null on failure
 */
export async function logActivity(vendorId, event, description = '') {
  try {
    return await ActivityLog.create({
      Vendor_ID: vendorId,
      Event: event,
      Description: description,
      EventTime: new Date(),
    });
  } catch (err) {
    console.error(`[activityLogService] Failed to log "${event}" for vendor ${vendorId}:`, err.message);
    return null;
  }
}

/**
 * Fetches the most recent activity entries for a vendor, newest first.
 * Used by controllers/activityLogController.js.
 * @param {string} vendorId
 * @param {number} [limit=20]
 */
export async function getRecentActivity(vendorId, limit = 20) {
  return ActivityLog.find({ Vendor_ID: vendorId })
    .sort({ EventTime: -1 })
    .limit(limit)
    .lean();
}
