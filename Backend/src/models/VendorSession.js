/**
 * models/VendorSession.js  *** NEW - aligns backend with ER diagram ***
 * -----------------------------------------------------------------------
 * Tracks a vendor's WhatsApp session state and DPDPA consent status.
 * This is the piece your ER diagram already committed to (VendorSession:
 * Session_ID, Vendor_ID, WhatsApp, SessionStatus, LastActive, Consent)
 * but that never got built - it's the actual DPDPA consent record, which
 * matters for the "User consent validation" line in your Testing
 * Strategy slide.
 *
 * Naming note: the ER diagram's `WhatsApp` attribute is stored here as
 * `WhatsAppHash` - same treatment as Vendor.PhoneHash in Week 1-2, for
 * the same reason (never persist a raw contact identifier). This is a
 * deliberate, minor naming deviation from the diagram, not a missed
 * field - worth a one-line footnote on the ER diagram slide so it
 * doesn't look like an inconsistency to a reviewer.
 *
 * One doc per vendor (like VendorLocation) - a vendor has exactly one
 * current session state, upserted as their WhatsApp interactions and
 * consent status change over time.
 * -----------------------------------------------------------------------
 */

import mongoose from 'mongoose';

const { Schema } = mongoose;

const VendorSessionSchema = new Schema(
  {
    Vendor_ID: {
      type: Schema.Types.ObjectId,
      ref: 'Vendor',
      required: [true, 'Vendor_ID is required'],
      unique: true,
      index: true,
    },

    // Hashed WhatsApp contact identifier - see naming note above.
    // Uses the same HMAC-SHA256 scheme as Vendor.PhoneHash
    // (utils/geoPrivacy.hashPhoneNumber), so a vendor whose WhatsApp
    // number IS their registered phone number produces the same hash
    // in both fields - useful for cross-referencing without ever
    // comparing raw numbers.
    WhatsAppHash: {
      type: String,
      required: [true, 'WhatsAppHash is required'],
      index: true,
    },

    SessionStatus: {
      type: String,
      enum: ['PENDING_CONSENT', 'ACTIVE', 'INACTIVE', 'REVOKED'],
      default: 'PENDING_CONSENT',
      index: true,
    },

    LastActive: {
      type: Date,
      default: Date.now,
    },

    // DPDPA consent flag - vendor has explicitly agreed (via a WhatsApp
    // opt-in flow the messaging-service teammate implements) to have
    // their location and profile data processed by VendiConnect.
    Consent: {
      type: Boolean,
      default: false,
    },

    // Not in the original ER diagram, but a near-mandatory companion to
    // a boolean Consent flag for any real DPDPA audit trail - "consent
    // was given" is much weaker without "and here's exactly when."
    // Left nullable so it doesn't force a diagram change - purely additive.
    ConsentTimestamp: {
      type: Date,
      default: null,
    },
  },
  { timestamps: false }
);

VendorSessionSchema.virtual('Session_ID').get(function () {
  return this._id;
});

VendorSessionSchema.set('toJSON', { virtuals: true });
VendorSessionSchema.set('toObject', { virtuals: true });

export default mongoose.model('VendorSession', VendorSessionSchema);
