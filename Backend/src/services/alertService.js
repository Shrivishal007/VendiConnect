import Alert from '../models/Alert.js';
import AlertThrottle from '../models/AlertThrottle.js';

// Throttle alerts to prevent spam - default 45 minutes between alerts for same vendor-resident pair
const ALERT_THROTTLE_MINUTES = parseInt(process.env.ALERT_THROTTLE_MINUTES, 10) || 45;

// Atomically claim the throttle slot for a vendor-resident pair.
// Matches only when the last alert is outside the window (or the pair is new);
// otherwise the upsert collides with the unique index (E11000), which means "throttled".
// Two concurrent workers can never both claim the same slot.
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

// Give the slot back if the alert could not be stored, so the resident is not silenced for nothing
async function releaseThrottleSlot(vendorId, residentId, claimedAt) {
  try {
    await AlertThrottle.updateOne(
      { Vendor_ID: vendorId, Resident_ID: residentId, LastAlertAt: claimedAt },
      { $set: { LastAlertAt: new Date(0) } }
    );
  } catch (err) {
    console.error('[alertService] Failed to release throttle slot:', err.message);
  }
}

// Record a new alert in the database
async function recordAlert(vendorId, residentId, etaMinutes, distanceKm, timestamp) {
  return Alert.create({
    Vendor_ID: vendorId,
    Resident_ID: residentId,
    Timestamp: timestamp,
    EtaMinutes: etaMinutes,
    DistanceAt: distanceKm,
  });
}

// Claim the throttle slot and record the alert if allowed
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
