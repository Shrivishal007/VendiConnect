/**
 * models/Alert.js
 * -----------------------------------------------------------------------
 * Audit/throttle log of every proactive "vendor is nearby" push
 * notification sent to a resident. This collection is the single
 * source of truth the Notification Throttling engine checks against
 * before firing a new FCM push - see controllers/proximityController.js
 * -> checkAndThrottleAlert().
 * -----------------------------------------------------------------------
 */

import mongoose from 'mongoose';
const { Schema } = mongoose;

const AlertSchema = new Schema(
  {
    // Alert_ID: exposed via `_id` (see virtual below).

    Vendor_ID: {
      type: Schema.Types.Mixed,
      ref: 'Vendor',
      default: null,
      index: true,
    },

    Resident_ID: {
      type: Schema.Types.Mixed,
      ref: 'Resident',
      default: null,
      index: true,
    },

    ResidentName: {
      type: String,
      default: 'Resident',
      trim: true,
    },

    VendorName: {
      type: String,
      default: 'Vendor',
      trim: true,
    },

    Type: {
      type: String,
      default: 'Stop Request',
      trim: true,
    },

    Status: {
      type: String,
      default: 'DISPATCHED', // DISPATCHED, ACKNOWLEDGED, COMPLETED
      trim: true,
    },

    Timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },

    EtaMinutes: {
      type: Number,
      default: 2,
      min: 0,
    },

    DistanceAtAlert: {
      type: Number,
      default: 0.15,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index on (Vendor_ID, Resident_ID, Timestamp): this is the
// exact index the throttle check hits - "find the most recent alert for
// this vendor/resident pair" - so it needs to be fast and covering.
AlertSchema.index({ Vendor_ID: 1, Resident_ID: 1, Timestamp: -1 });

AlertSchema.virtual('Alert_ID').get(function () {
  return this._id;
});

AlertSchema.set('toJSON', { virtuals: true });
AlertSchema.set('toObject', { virtuals: true });

const Alert = mongoose.model('Alert', AlertSchema);

export default Alert;
