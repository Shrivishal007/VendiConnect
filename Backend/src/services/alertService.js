import Alert from '../models/Alert.js';
import AlertThrottle from '../models/AlertThrottle.js';

// Set the minimum interval between alerts for the same vendor-resident pair
const ALERT_THROTTLE_MINUTES = parseInt(process.env.ALERT_THROTTLE_MINUTES, 10) || 45;

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
async function recordAlert(vendorId, residentId, etaMinutes, distanceKm, timestamp) {
  return Alert.create({
    Vendor_ID: vendorId,
    Resident_ID: residentId,
    Timestamp: timestamp,
    EtaMinutes: etaMinutes,
    DistanceAt: distanceKm,
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
    const alert = await recordAlert(vendorId, residentId, etaMinutes, distanceKm, claimedAt);
    return { success: true, alert };
  } catch (err) {
    await releaseThrottleSlot(vendorId, residentId, claimedAt);
    throw err;
  }
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
