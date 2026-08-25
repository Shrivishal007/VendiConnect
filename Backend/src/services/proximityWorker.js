/**
 * services/proximityWorker.js  *** NEW THIS WEEK ***
 * -----------------------------------------------------------------------
 * Week 3 core feature: when a vendor's location is updated, find every
 * resident whose NotificationRadius covers that vendor, throttle-check
 * each one, and fire an FCM push for the residents who pass.
 *
 * Entry point: matchAndNotifyResidents(vendorId, vendorGeoPoint)
 * Called from controllers/locationController.js right after a location
 * upsert succeeds.
 *
 * --- Implementation note on why this is a brute-force scan, not $near ---
 * MongoDB's $near/$geoNear require a 2dsphere index on the field being
 * queried, and they return "points within X of a single origin". Here
 * the origin is fixed (the vendor) but the radius is PER-RESIDENT
 * (NotificationRadius varies 50-5000m), so a single indexed $near query
 * can't directly express "give me everyone whose OWN radius contains
 * this point". We instead fetch residents in lean batches and filter
 * with the Haversine utility in application code.
 *
 * This is perfectly fine at prototype/M0 scale (hundreds to low
 * thousands of residents). If/when the resident base grows large
 * enough for this to matter, the standard fix is to add a 2dsphere
 * index on a `homeGeo` GeoJSON field on Resident, run a single $geoNear
 * bounded by the MAX possible NotificationRadius to shrink the
 * candidate set, then apply the per-resident radius filter only to that
 * much smaller set. Left as a documented future optimization rather
 * than premature complexity for a prototype.
 * -----------------------------------------------------------------------
 */

import Resident from '../models/Resident.js';
import Vendor from '../models/Vendor.js';
import { getDistanceAndEta } from '../utils/haversine.js';
import { checkAndThrottleAlert } from './alertService.js';
import { sendPushNotification } from './fcmService.js';

// Residents fetched in batches to keep memory bounded on the M0 tier
// even as the resident collection grows.
const RESIDENT_BATCH_SIZE = 200;

/**
 * Main entry point. Given a vendor's freshly-updated (already privacy-
 * truncated) GeoJSON point, finds in-range residents, throttles, and
 * pushes notifications.
 *
 * Deliberately never throws - a failure here should never block the
 * location-update API response. Errors are caught per-resident so one
 * bad token/DB hiccup doesn't abort the whole matching pass.
 *
 * @param {string} vendorId
 * @param {{ type: 'Point', coordinates: [number, number] }} vendorGeoPoint [lng, lat]
 * @returns {Promise<{ matched: number, notified: number, throttled: number, failed: number }>}
 */
export async function matchAndNotifyResidents(vendorId, vendorGeoPoint) {
  const summary = { matched: 0, notified: 0, throttled: 0, failed: 0 };

  try {
    const vendor = await Vendor.findById(vendorId).lean();
    if (!vendor) {
      console.warn(`[proximityWorker] Vendor ${vendorId} not found - skipping match pass`);
      return summary;
    }

    const [vendorLng, vendorLat] = vendorGeoPoint.coordinates;

    let skip = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const residentBatch = await Resident.find({})
        .select('HomeLatitude HomeLongitude NotificationRadius FcmToken')
        .skip(skip)
        .limit(RESIDENT_BATCH_SIZE)
        .lean();

      if (residentBatch.length === 0) break;

      // Process this batch's residents in parallel - each one is an
      // independent read (throttle check) + write (Alert + push), so
      // there's no shared mutable state to race on across residents.
      await Promise.all(
        residentBatch.map((resident) =>
          processResidentMatch(resident, vendor, vendorLat, vendorLng, summary)
        )
      );

      skip += RESIDENT_BATCH_SIZE;
    }
  } catch (err) {
    console.error('[proximityWorker.matchAndNotifyResidents] Unexpected error:', err);
  }

  return summary;
}

/**
 * Evaluates a single resident against the vendor's new location:
 * distance check -> throttle check -> push. Mutates `summary` in place
 * for aggregate reporting.
 * @private
 */
async function processResidentMatch(resident, vendor, vendorLat, vendorLng, summary) {
  try {
    const { distanceKm, etaMinutes } = getDistanceAndEta(
      { lat: vendorLat, lng: vendorLng },
      { lat: resident.HomeLatitude, lng: resident.HomeLongitude }
    );

    const distanceMeters = distanceKm * 1000;

    // Out of this resident's requested notification radius - skip entirely.
    if (distanceMeters > resident.NotificationRadius) {
      return;
    }

    summary.matched += 1;

    // Anti-spam: only one alert per (vendor, resident) pair per throttle window.
    const { allowed, alert } = await checkAndThrottleAlert(
      vendor._id,
      resident._id,
      etaMinutes,
      distanceKm
    );

    if (!allowed) {
      summary.throttled += 1;
      return;
    }

    if (!resident.FcmToken) {
      // Alert was still logged (for analytics/throttling correctness)
      // even though there's no device to push to.
      console.warn(
        `[proximityWorker] Resident ${resident._id} matched but has no FcmToken - alert logged, push skipped`
      );
      summary.failed += 1;
      return;
    }

    const pushResult = await sendPushNotification(
      resident.FcmToken,
      `${vendor.VendorName} is nearby!`,
      `Approx. ${etaMinutes} min walk (${distanceKm.toFixed(2)} km away).`,
      {
        vendorId: String(vendor._id),
        alertId: String(alert._id),
        etaMinutes,
        distanceKm,
      }
    );

    if (pushResult.success) {
      summary.notified += 1;
    } else {
      summary.failed += 1;
    }
  } catch (err) {
    console.error(`[proximityWorker] Failed to process resident ${resident._id}:`, err.message);
    summary.failed += 1;
  }
}
