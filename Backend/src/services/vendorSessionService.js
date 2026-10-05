import Sessions from '../models/Sessions.js';
import Vendor from '../models/Vendor.js';
import Location from '../models/Location.js';
import { hashPhoneNumber } from '../utils/privacy.js';
import { logActivity } from './activityLogService.js';

// Session state machine: PENDING_CONSENT -> ACTIVE -> REVOKED (and back to ACTIVE if consent is granted again)

// Stop tracking a vendor: remove the stored location and take them off the live map
async function stopTracking(vendorId) {
  await Promise.all([
    Location.deleteOne({ Vendor_ID: vendorId }),
    Vendor.updateOne({ _id: vendorId, Status: 'ACTIVE' }, { $set: { Status: 'INACTIVE' } }),
  ]);
}

// Record vendor consent decision (grant or revoke)
export async function recordConsent(vendorId, rawPhoneNumber, consentGiven) {
  const now = new Date();

  const update = {
    Vendor_ID: vendorId,
    Phone: hashPhoneNumber(rawPhoneNumber),
    Consent: consentGiven,
    Status: consentGiven ? 'ACTIVE' : 'REVOKED',
    LastActive: now,
    // ConsentTimestamp is kept on withdrawal so the original grant stays on record
    ...(consentGiven ? { ConsentTimestamp: now, ConsentWithdrawnAt: null } : { ConsentWithdrawnAt: now }),
  };

  const session = await Sessions.findOneAndUpdate({ Vendor_ID: vendorId }, update, {
    returnDocument: 'after',
    upsert: true,
    setDefaultsOnInsert: true,
    runValidators: true,
  });

  if (!consentGiven) {
    await stopTracking(vendorId);
  }
  logActivity(vendorId, consentGiven ? 'Consent Granted' : 'Consent Withdrawn');

  return session;
}

// Withdraw vendor consent: mark session revoked and stop tracking. Returns null if no session exists
export async function withdrawConsent(vendorId) {
  const now = new Date();

  const session = await Sessions.findOneAndUpdate(
    { Vendor_ID: vendorId },
    {
      Consent: false,
      Status: 'REVOKED',
      ConsentWithdrawnAt: now,
      LastActive: now,
    },
    { returnDocument: 'after' }
  );

  if (!session) {
    return null;
  }

  await stopTracking(vendorId);
  logActivity(vendorId, 'Consent Withdrawn');

  return session;
}

// Check if vendor has active consent
export async function hasActiveConsent(vendorId) {
  const session = await Sessions.findOne({ Vendor_ID: vendorId }).select('Consent Status').lean();

  return Boolean(session && session.Consent === true && session.Status === 'ACTIVE');
}

// Update last active timestamp for a vendor session (never throws)
export async function touchLastActive(vendorId) {
  try {
    await Sessions.updateOne({ Vendor_ID: vendorId }, { $set: { LastActive: new Date() } });
  } catch (err) {
    console.error(`[vendorSessionService] Failed to touch LastActive for vendor ${vendorId}:`, err.message);
  }
}

// Get vendor session details
export async function getSession(vendorId) {
  return Sessions.findOne({ Vendor_ID: vendorId }).lean();
}
