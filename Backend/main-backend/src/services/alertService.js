import Alert from '../models/Alert.js';
import AlertThrottle from '../models/AlertThrottle.js';
import { requiredPositiveInteger } from '../config/env.js';

// Set the minimum interval between alerts for the same vendor-resident pair
const ALERT_THROTTLE_MINUTES = requiredPositiveInteger('ALERT_THROTTLE_MINUTES');

// Atomically claim a throttle slot to prevent duplicate alerts from concurrent workers
async function claimThrottleSlot(vendorId, residentId, now) {
  const windowStart = new Date(now.getTime() - ALERT_THROTTLE_MINUTES * 60 * 1000);

  try {
    await AlertThrottle.updateOne(
      { Vendor_ID: vendorId, Resident_ID: residentId, LastAlertAt: { $lte: windowStart } },
      { $set: { LastAlertAt: now } },
      { upsert: true }
    );
    return true;
  } catch (err) {
    if (err.code === 11000) {
      return false;
    }
    throw err;
  }
}

// Release the throttle slot if storing the alert fails
export async function releaseThrottleSlot(vendorId, residentId, claimedAt) {
  try {
    await AlertThrottle.updateOne(
      { Vendor_ID: vendorId, Resident_ID: residentId, LastAlertAt: claimedAt },
      { $set: { LastAlertAt: new Date(0) } }
    );
  } catch (err) {
    console.error('[alertService] Failed to release throttle slot:', err.message);
  }
}

// Store the alert details in the database
export async function recordAlert(
  vendorId,
  residentId,
  etaMinutes,
  distanceKm,
  timestamp,
  deliveryStatus = 'IN_APP',
  type = 'PROXIMITY_ALERT'
) {
  return Alert.create({
    Vendor_ID: vendorId,
    Resident_ID: residentId,
    Timestamp: timestamp,
    EtaMinutes: etaMinutes,
    DistanceAt: distanceKm,
    DeliveryStatus: deliveryStatus,
    Type: type,
    Read: false,
  });
}

// Claim a throttle slot without recording the alert
export async function checkThrottleOnly(vendorId, residentId) {
  const now = new Date();
  const claimed = await claimThrottleSlot(vendorId, residentId, now);
  return { allowed: claimed, claimedAt: now };
}

// Record the alert after a push notification succeeds
export async function recordAlertAfterPush(vendorId, residentId, etaMinutes, distanceKm, claimedAt) {
  try {
    const alert = await recordAlert(vendorId, residentId, etaMinutes, distanceKm, claimedAt, 'DELIVERED');
    return { success: true, alert };
  } catch (err) {
    await releaseThrottleSlot(vendorId, residentId, claimedAt);
    throw err;
  }
}

// Record alert for resident with specified delivery status
export async function recordAlertForResident(vendorId, residentId, etaMinutes, distanceKm, claimedAt, deliveryStatus = 'IN_APP') {
  try {
    const alert = await recordAlert(vendorId, residentId, etaMinutes, distanceKm, claimedAt, deliveryStatus);
    return { success: true, alert };
  } catch (err) {
    await releaseThrottleSlot(vendorId, residentId, claimedAt);
    throw err;
  }
}

// Fetch all alerts for a given resident with full vendor details
export async function getResidentAlerts(residentId, { limit = 50, skip = 0 } = {}) {
  const Location = (await import('../models/Location.js')).default;
  const Category = (await import('../models/Category.js')).default;

  const alerts = await Alert.find({ Resident_ID: residentId })
    .populate({
      path: 'Vendor_ID',
      select: 'Name Vehicle Category_ID AvgRating Status Language',
      populate: {
        path: 'Category_ID',
        select: 'Name Icon',
      },
    })
    .sort({ Timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Alert.countDocuments({ Resident_ID: residentId });
  const unreadCount = await Alert.countDocuments({ Resident_ID: residentId, Read: false });

  // Enrich with vendor current locations if available
  const vendorIds = alerts.map((a) => a.Vendor_ID?._id).filter(Boolean);
  const locations = await Location.find({ Vendor_ID: { $in: vendorIds } }).lean();
  const locationMap = new Map();
  for (const loc of locations) {
    if (loc.geo?.coordinates?.length === 2) {
      locationMap.set(String(loc.Vendor_ID), {
        latitude: loc.geo.coordinates[1],
        longitude: loc.geo.coordinates[0],
      });
    }
  }

  const data = alerts.map((a) => ({
    id: a._id.toString(),
    vendorId: a.Vendor_ID?._id?.toString() || '',
    vendorName: a.Vendor_ID?.Name || 'Street Vendor',
    vehicle: a.Vendor_ID?.Vehicle || 'Push Cart',
    categoryName: a.Vendor_ID?.Category_ID?.Name || 'General Goods',
    categoryId: a.Vendor_ID?.Category_ID?._id?.toString() || '',
    etaMinutes: a.EtaMinutes,
    distanceMeters: Math.round(a.DistanceAt * 1000),
    timestamp: a.Timestamp,
    read: Boolean(a.Read),
    type: a.Type || 'PROXIMITY_ALERT',
    deliveryStatus: a.DeliveryStatus || 'IN_APP',
    canRate: true,
    vendorCoordinates: locationMap.get(String(a.Vendor_ID?._id)) || null,
  }));

  return { data, total, unreadCount };
}

// Mark an alert as read
export async function markAlertAsRead(alertId, residentId) {
  return Alert.findOneAndUpdate(
    { _id: alertId, Resident_ID: residentId },
    { $set: { Read: true } },
    { returnDocument: 'after' }
  );
}

// Mark all alerts as read for a resident
export async function markAllAlertsAsRead(residentId) {
  return Alert.updateMany(
    { Resident_ID: residentId, Read: false },
    { $set: { Read: true } }
  );
}

// Claim the throttle slot and record the alert in one operation for legacy compatibility
export async function checkAndThrottleAlert(vendorId, residentId, etaMinutes, distanceKm) {
  const now = new Date();

  const claimed = await claimThrottleSlot(vendorId, residentId, now);
  if (!claimed) {
    return { allowed: false, alert: null };
  }

  try {
    const alert = await recordAlert(vendorId, residentId, etaMinutes, distanceKm, now);
    return { allowed: true, alert };
  } catch (err) {
    await releaseThrottleSlot(vendorId, residentId, now);
    throw err;
  }
}
