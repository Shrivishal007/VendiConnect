import VendorSession from '../models/VendorSession.js';
import { hashPhoneNumber } from '../utils/geoPrivacy.js';

export const CURRENT_NOTICE_VERSION = 'DPDPA-2023-v1.0';

async function findOrCreateSession(vendorId, rawWhatsAppId) {
  let session = await VendorSession.findOne({ Vendor_ID: vendorId });

  if (session) {
    return session;
  }

  if (!rawWhatsAppId) {
    return null;
  }

  session = await VendorSession.create({
    Vendor_ID: vendorId,
    WhatsAppHash: hashPhoneNumber(rawWhatsAppId),
    SessionStatus: 'PENDING_CONSENT',
    LastActive: new Date(),
    Consent: false,
  });

  return session;
}

export async function recordConsent(vendorId, rawWhatsAppId, consentGiven, noticeVersion = CURRENT_NOTICE_VERSION) {
  const whatsAppHash = hashPhoneNumber(rawWhatsAppId);
  const now = new Date();

  const session = await VendorSession.findOneAndUpdate(
    { Vendor_ID: vendorId },
    {
      Vendor_ID: vendorId,
      WhatsAppHash: whatsAppHash,
      Consent: consentGiven,
      ConsentTimestamp: now,
      NoticeVersion: noticeVersion,
      SessionStatus: consentGiven ? 'ACTIVE' : 'REVOKED',
      LastActive: now,
      ...(consentGiven ? { ConsentWithdrawnAt: null } : { ConsentWithdrawnAt: now }),
    },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
  );

  return session;
}

export async function withdrawConsent(vendorId) {
  const now = new Date();

  return VendorSession.findOneAndUpdate(
    { Vendor_ID: vendorId },
    {
      Consent: false,
      SessionStatus: 'REVOKED',
      ConsentWithdrawnAt: now,
      LastActive: now,
    },
    { new: true }
  );
}

export async function hasActiveConsent(vendorId) {
  const session = await VendorSession.findOne({ Vendor_ID: vendorId })
    .select('Consent SessionStatus')
    .lean();

  return Boolean(session && session.Consent === true && session.SessionStatus === 'ACTIVE');
}

export async function touchLastActive(vendorId) {
  try {
    await VendorSession.updateOne(
      { Vendor_ID: vendorId },
      { $set: { LastActive: new Date() } }
    );
  } catch (err) {
    console.error(`[vendorSessionService] Failed to touch LastActive for vendor ${vendorId}:`, err.message);
  }
}

export async function getSession(vendorId) {
  return VendorSession.findOne({ Vendor_ID: vendorId }).lean();
}

export { findOrCreateSession };
