import Resident from '../models/Resident.js';
import Vendor from '../models/Vendor.js';
import { getDistanceAndEta } from '../utils/haversine.js';
import { checkThrottleOnly, recordAlertAfterPush, releaseThrottleSlot, recordAlertForResident } from './alertService.js';
import { sendPushNotification } from './fcmService.js';

const RESIDENT_BATCH_SIZE = 200;

// Maximum supported notification radius, used to limit candidate searches
const MAX_NOTIFICATION_RADIUS_METERS = 5000;
const METERS_PER_DEGREE_LAT = 111320;

// Build a bounding box to retrieve only residents near the vendor
function buildCandidateFilter(vendorLat, vendorLng) {
  const latDelta = MAX_NOTIFICATION_RADIUS_METERS / METERS_PER_DEGREE_LAT;
  const cosLat = Math.max(Math.cos((vendorLat * Math.PI) / 180), 0.01);
  const lngDelta = MAX_NOTIFICATION_RADIUS_METERS / (METERS_PER_DEGREE_LAT * cosLat);

  const filter = {
    Latitude: { $gte: vendorLat - latDelta, $lte: vendorLat + latDelta },
  };

  // Fall back to latitude filtering when longitude bounds are unreliable
  if (lngDelta < 90 && Math.abs(vendorLng) + lngDelta < 180) {
    filter.Longitude = { $gte: vendorLng - lngDelta, $lte: vendorLng + lngDelta };
  } else {
    filter.Longitude = { $ne: null };
  }

  return filter;
}

// Find nearby residents and send notifications when they meet proximity criteria
export async function matchAndNotifyResidents(vendorId, vendorGeoPoint) {
  const summary = { matched: 0, notified: 0, throttled: 0, failed: 0 };

  try {
    const vendor = await Vendor.findById(vendorId).lean();
    if (!vendor) {
      console.warn(`[proximityWorker] Vendor ${vendorId} not found - skipping match pass`);
      return summary;
    }
    if (vendor.Status === 'SUSPENDED') {
      console.warn(`[proximityWorker] Vendor ${vendorId} is suspended - skipping match pass`);
      return summary;
    }

    const [vendorLng, vendorLat] = vendorGeoPoint.coordinates;
    const candidateFilter = buildCandidateFilter(vendorLat, vendorLng);

    // Process residents in stable batches without loading the entire collection
    let lastId = null;
    while (true) {
      const filter = lastId ? { ...candidateFilter, _id: { $gt: lastId } } : candidateFilter;

      const residentBatch = await Resident.find(filter)
        .select('Latitude Longitude NotificationRadius FcmToken')
        .sort({ _id: 1 })
        .limit(RESIDENT_BATCH_SIZE)
        .lean();

      if (residentBatch.length === 0) break;

      // Evaluate residents concurrently within each batch
      await Promise.all(
        residentBatch.map((resident) =>
          processResidentMatch(resident, vendor, vendorLat, vendorLng, summary)
        )
      );

      lastId = residentBatch[residentBatch.length - 1]._id;
    }
  } catch (err) {
    console.error('[proximityWorker.matchAndNotifyResidents] Unexpected error:', err);
  }

  return summary;
}

// Check an individual resident's distance and handle notification delivery
async function processResidentMatch(resident, vendor, vendorLat, vendorLng, summary) {
  try {
    const { distanceKm, etaMinutes } = getDistanceAndEta(
      { lat: vendorLat, lng: vendorLng },
      { lat: resident.Latitude, lng: resident.Longitude }
    );

    const distanceMeters = distanceKm * 1000;

    // Ignore residents outside their configured notification radius
    if (distanceMeters > resident.NotificationRadius) {
      return;
    }

    summary.matched += 1;

    // Claim a throttle slot to prevent repeated notifications
    const { allowed, claimedAt } = await checkThrottleOnly(vendor._id, resident._id);

    if (!allowed) {
      summary.throttled += 1;
      return;
    }

    // Send in-app notification by persisting to Alert collection
    const initialDeliveryStatus = resident.FcmToken ? 'PENDING' : 'IN_APP';
    const { alert } = await recordAlertForResident(
      vendor._id,
      resident._id,
      etaMinutes,
      distanceKm,
      claimedAt,
      initialDeliveryStatus
    );

    summary.notified += 1;

    // If resident has an FCM push token, also attempt native push notification
    if (resident.FcmToken) {
      try {
        const pushResult = await sendPushNotification(
          resident.FcmToken,
          `${vendor.Name} is nearby!`,
          `Approx. ${etaMinutes} min walk (${distanceKm.toFixed(2)} km away).`,
          {
            vendorId: String(vendor._id),
            etaMinutes,
            distanceKm,
          }
        );

        if (pushResult.success) {
          if (alert) {
            alert.DeliveryStatus = 'DELIVERED';
            await alert.save().catch(() => {});
          }
        } else {
          if (alert) {
            alert.DeliveryStatus = 'IN_APP';
            await alert.save().catch(() => {});
          }
          if (pushResult.invalidToken) {
            await Resident.updateOne({ _id: resident._id }, { $set: { FcmToken: null } });
          }
        }
      } catch (pushErr) {
        console.warn(`[proximityWorker] Push delivery failed for resident ${resident._id}, alert saved in-app:`, pushErr.message);
      }
    }
  } catch (err) {
    console.error(`[proximityWorker] Failed to process resident ${resident._id}:`, err.message);
    summary.failed += 1;
  }
}
