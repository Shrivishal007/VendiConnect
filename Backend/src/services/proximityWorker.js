import Resident from '../models/Resident.js';
import Vendor from '../models/Vendor.js';
import { getDistanceAndEta } from '../utils/haversine.js';
import { checkAndThrottleAlert } from './alertService.js';
import { sendPushNotification } from './fcmService.js';

const RESIDENT_BATCH_SIZE = 200;

// Largest NotificationRadius a resident can store (see Resident model); used to bound the candidate search
const MAX_NOTIFICATION_RADIUS_METERS = 5000;
const METERS_PER_DEGREE_LAT = 111320;

// Bounding box around the vendor so only nearby residents are loaded instead of every resident
function buildCandidateFilter(vendorLat, vendorLng) {
  const latDelta = MAX_NOTIFICATION_RADIUS_METERS / METERS_PER_DEGREE_LAT;
  const cosLat = Math.max(Math.cos((vendorLat * Math.PI) / 180), 0.01);
  const lngDelta = MAX_NOTIFICATION_RADIUS_METERS / (METERS_PER_DEGREE_LAT * cosLat);

  const filter = {
    Latitude: { $gte: vendorLat - latDelta, $lte: vendorLat + latDelta },
  };

  // Near the poles or the antimeridian the longitude box is unreliable, so fall back to latitude only
  if (lngDelta < 90 && Math.abs(vendorLng) + lngDelta < 180) {
    filter.Longitude = { $gte: vendorLng - lngDelta, $lte: vendorLng + lngDelta };
  } else {
    filter.Longitude = { $ne: null };
  }

  return filter;
}

// Match vendor to nearby residents and send push notifications
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

    // Keyset pagination on _id: stable even if residents are added or removed mid-pass
    let lastId = null;
    while (true) {
      const filter = lastId ? { ...candidateFilter, _id: { $gt: lastId } } : candidateFilter;

      const residentBatch = await Resident.find(filter)
        .select('Latitude Longitude NotificationRadius FcmToken')
        .sort({ _id: 1 })
        .limit(RESIDENT_BATCH_SIZE)
        .lean();

      if (residentBatch.length === 0) break;

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

// Process individual resident match for proximity and alert
async function processResidentMatch(resident, vendor, vendorLat, vendorLng, summary) {
  try {
    const { distanceKm, etaMinutes } = getDistanceAndEta(
      { lat: vendorLat, lng: vendorLng },
      { lat: resident.Latitude, lng: resident.Longitude }
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
      `${vendor.Name} is nearby!`,
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

      if (pushResult.invalidToken) {
        await Resident.updateOne({ _id: resident._id }, { $set: { FcmToken: null } });
      }
    }
  } catch (err) {
    console.error(`[proximityWorker] Failed to process resident ${resident._id}:`, err.message);
    summary.failed += 1;
  }
}
