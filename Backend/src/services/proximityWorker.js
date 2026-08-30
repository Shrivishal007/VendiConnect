import Resident from '../models/Resident.js';
import Vendor from '../models/Vendor.js';
import { getDistanceAndEta } from '../utils/haversine.js';
import { checkAndThrottleAlert } from './alertService.js';
import { sendPushNotification } from './fcmService.js';

const RESIDENT_BATCH_SIZE = 200;

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
    while (true) {
      const residentBatch = await Resident.find({})
        .select('HomeLatitude HomeLongitude NotificationRadius FcmToken')
        .skip(skip)
        .limit(RESIDENT_BATCH_SIZE)
        .lean();

      if (residentBatch.length === 0) break;

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

async function processResidentMatch(resident, vendor, vendorLat, vendorLng, summary) {
  try {
    const { distanceKm, etaMinutes } = getDistanceAndEta(
      { lat: vendorLat, lng: vendorLng },
      { lat: resident.HomeLatitude, lng: resident.HomeLongitude }
    );

    const distanceMeters = distanceKm * 1000;

    if (distanceMeters > resident.NotificationRadius) {
      return;
    }

    summary.matched += 1;

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
