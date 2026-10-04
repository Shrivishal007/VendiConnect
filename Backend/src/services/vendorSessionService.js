import Sessions from '../models/Sessions.js';
import { hashPhoneNumber } from '../utils/privacy.js';

// Find existing session or create a new pending consent session
async function findOrCreateSession(vendorId, rawPhoneNumber) {
  let session = await Sessions.findOne({ Vendor_ID: vendorId });

  if (session) {
    return session;
  }

  if (!rawPhoneNumber) {
    return null;
  }

  session = await Sessions.create({
    Vendor_ID: vendorId,
    Phone: hashPhoneNumber(rawPhoneNumber),
    Status: 'PENDING_CONSENT',
    LastActive: new Date(),
    Consent: false,
  });

  return session;
}

// Record vendor consent decision (grant or revoke)
export async function recordConsent(vendorId, rawPhoneNumber, consentGiven) {
  const whatsAppHash = hashPhoneNumber(rawPhoneNumber);
  const now = new Date();

  const session = await Sessions.findOneAndUpdate(
    { Vendor_ID: vendorId },
    {
      Vendor_ID: vendorId,
      Phone: whatsAppHash,
      Consent: consentGiven,
      ConsentTimestamp: now,
      Status: consentGiven ? 'ACTIVE' : 'REVOKED',
      LastActive: now,
      ...(consentGiven ? { ConsentWithdrawnAt: null } : { ConsentWithdrawnAt: now }),
    },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true, runValidators: true }
  );

  return session;
}

// Withdraw vendor consent and mark session as revoked
export async function withdrawConsent(vendorId) {
  const now = new Date();

  return Sessions.findOneAndUpdate(
    { Vendor_ID: vendorId },
    {
      Consent: false,
      Status: 'REVOKED',
      ConsentWithdrawnAt: now,
      LastActive: now,
    },
    { returnDocument: 'after' }
  );
}

// Check if vendor has active consent
export async function hasActiveConsent(vendorId) {
  const session = await Sessions.findOne({ Vendor_ID: vendorId })
    .select('Consent Status')
    .lean();

  return Boolean(session && session.Consent === true && session.Status === 'ACTIVE');
}

// Update last active timestamp for a vendor session
export async function touchLastActive(vendorId) {
  try {
    await Sessions.updateOne(
      { Vendor_ID: vendorId },
      { $set: { LastActive: new Date() } }
    );
  } catch (err) {
    console.error(`[vendorSessionService] Failed to touch LastActive for vendor ${vendorId}:`, err.message);
  }
}

// Get vendor session details
export async function getSession(vendorId) {
  return Sessions.findOne({ Vendor_ID: vendorId }).lean();
}

export { findOrCreateSession };
