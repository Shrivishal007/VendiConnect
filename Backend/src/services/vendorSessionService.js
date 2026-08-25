/**
 * services/vendorSessionService.js  *** NEW ***
 * -----------------------------------------------------------------------
 * Business logic for VendorSession: upserting session state, recording
 * consent, and keeping LastActive fresh. Kept as a service (not just
 * inline controller logic) because both the consent endpoint AND the
 * existing locationController need to touch a vendor's session, and
 * duplicating "find or create session" in two controllers is exactly
 * the kind of drift this project has already flagged as a recurring
 * problem (see project notes on the proactive alert pipeline).
 * -----------------------------------------------------------------------
 */

import VendorSession from '../models/VendorSession.js';
import { hashPhoneNumber } from '../utils/geoPrivacy.js';

/**
 * Finds or creates a vendor's session document. Called by the consent
 * endpoint (with a WhatsApp identifier to hash and store) and, more
 * lightly, by the location controller (which just needs to touch
 * LastActive and doesn't have a WhatsApp identifier on hand).
 *
 * @param {string} vendorId
 * @param {string} [rawWhatsAppId] Raw WhatsApp contact identifier (phone
 *   number or WA ID) - hashed before storage. Omit when you only need to
 *   touch an existing session (e.g. from a location ping) and don't want
 *   to accidentally create a malformed one without a WhatsAppHash.
 * @returns {Promise<Object|null>} the session document, or null if none
 *   exists yet and no rawWhatsAppId was given to create one.
 */
async function findOrCreateSession(vendorId, rawWhatsAppId) {
  let session = await VendorSession.findOne({ Vendor_ID: vendorId });

  if (session) {
    return session;
  }

  if (!rawWhatsAppId) {
    // No session yet and nothing to create one with - caller (e.g. a
    // location ping arriving before any WhatsApp consent flow) should
    // treat this as "no session info available" rather than an error.
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

/**
 * Records (or updates) a vendor's consent decision. This is the
 * function the WhatsApp opt-in webhook flow calls once a vendor has
 * replied to a consent prompt.
 *
 * @param {string} vendorId
 * @param {string} rawWhatsAppId Raw WhatsApp identifier - hashed before storage
 * @param {boolean} consentGiven
 * @returns {Promise<Object>} the updated session document
 */
export async function recordConsent(vendorId, rawWhatsAppId, consentGiven) {
  const whatsAppHash = hashPhoneNumber(rawWhatsAppId);

  const session = await VendorSession.findOneAndUpdate(
    { Vendor_ID: vendorId },
    {
      Vendor_ID: vendorId,
      WhatsAppHash: whatsAppHash,
      Consent: consentGiven,
      ConsentTimestamp: new Date(),
      SessionStatus: consentGiven ? 'ACTIVE' : 'REVOKED',
      LastActive: new Date(),
    },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
  );

  return session;
}

/**
 * Best-effort "keep session warm" touch, called from locationController
 * after a location ping. Deliberately does NOT create a session if one
 * doesn't exist yet (a vendor can share location before completing a
 * consent flow in some onboarding orders) and never throws - this must
 * never be allowed to break the location-update response.
 *
 * @param {string} vendorId
 */
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

/**
 * Reads the current session for a vendor (e.g. for the admin dashboard
 * or a consent-status check). Returns null if no session exists yet.
 * @param {string} vendorId
 */
export async function getSession(vendorId) {
  return VendorSession.findOne({ Vendor_ID: vendorId }).lean();
}

export { findOrCreateSession };
