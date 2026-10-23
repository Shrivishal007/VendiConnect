import Sessions from '../models/Sessions.js';
import Vendor from '../models/Vendor.js';
import Location from '../models/Location.js';
import { hashPhoneNumber } from '../utils/privacy.js';
import { logActivity } from './activityLogService.js';

// Manage vendor consent and session states throughout the tracking lifecycle

// Stop location tracking and remove the vendor from the live map
async function stopTracking(vendorId) {
  await Promise.all([
    Location.deleteOne({ Vendor_ID: vendorId }),
    Vendor.updateOne({ _id: vendorId, Status: 'ACTIVE' }, { $set: { Status: 'INACTIVE' } }),
  ]);
}

// Record a vendor's consent decision and update the session
export async function recordConsent(vendorId, rawPhoneNumber, consentGiven) {
  const now = new Date();

  const update = {
    Vendor_ID: vendorId,
    Phone: hashPhoneNumber(rawPhoneNumber),
    Consent: consentGiven,
    Status: consentGiven ? 'ACTIVE' : 'REVOKED',
    LastActive: now,
    // Preserve the original consent timestamp when consent is withdrawn
    ...(consentGiven ? { ConsentTimestamp: now, ConsentWithdrawnAt: null } : { ConsentWithdrawnAt: now }),
  };

  const session = await Sessions.findOneAndUpdate({ Vendor_ID: vendorId }, update, {
    returnDocument: 'after',
    upsert: true,
    setDefaultsOnInsert: true,
    runValidators: true,
  });

  // Remove stored location data when consent is denied or withdrawn
  if (!consentGiven) {
    await stopTracking(vendorId);
  }

  // Synchronize consent state directly on Vendor record
  await Vendor.updateOne(
    { _id: vendorId },
    {
      $set: {
        LocationConsent: consentGiven,
        ConsentTimestamp: now,
        ...(consentGiven ? {} : { Status: 'INACTIVE' }),
      },
    }
  );

  // Log the consent decision for auditing
  logActivity(vendorId, consentGiven ? 'Consent Granted' : 'Consent Withdrawn');

  return session;
}

// Withdraw consent, stop tracking, and return null if no session exists
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

  // Delete location data and deactivate the vendor
  await stopTracking(vendorId);
  await Vendor.updateOne(
    { _id: vendorId },
    { $set: { LocationConsent: false, Status: 'INACTIVE', ConsentTimestamp: now } }
  );
  logActivity(vendorId, 'Consent Withdrawn');

  return session;
}

// Verify that the vendor has explicitly granted and currently maintains consent
export async function hasActiveConsent(vendorId) {
  const session = await Sessions.findOne({ Vendor_ID: vendorId }).select('Consent Status').lean();

  return Boolean(session && session.Consent === true && session.Status === 'ACTIVE');
}

// Refresh the session's last-active timestamp without interrupting the caller
export async function touchLastActive(vendorId) {
  try {
    await Sessions.updateOne({ Vendor_ID: vendorId }, { $set: { LastActive: new Date() } });
  } catch (err) {
    console.error(`[vendorSessionService] Failed to touch LastActive for vendor ${vendorId}:`, err.message);
  }
}

// Retrieve the vendor's session details
export async function getSession(vendorId) {
  return Sessions.findOne({ Vendor_ID: vendorId }).lean();
}
