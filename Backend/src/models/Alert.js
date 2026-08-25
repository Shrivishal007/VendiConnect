/**
 * models/Alert.js
 * -----------------------------------------------------------------------
 * Audit/throttle log of every proactive push sent to a resident.
 * services/proximityWorker.js writes to this via services/alertService.js
 * BEFORE firing an FCM push, so the throttle check always has an
 * accurate view of "was this pair already notified recently".
 * -----------------------------------------------------------------------
 */

import mongoose from 'mongoose';

const { Schema } = mongoose;

const AlertSchema = new Schema(
  {
    Vendor_ID: {
      type: Schema.Types.ObjectId,
      ref: 'Vendor',
      required: [true, 'Vendor_ID is required'],
      index: true,
    },

    Resident_ID: {
      type: Schema.Types.ObjectId,
      ref: 'Resident',
      required: [true, 'Resident_ID is required'],
      index: true,
    },

    Timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },

    EtaMinutes: {
      type: Number,
      required: [true, 'EtaMinutes is required'],
      min: 0,
    },

    DistanceAtAlert: {
      type: Number, // kilometers
      required: [true, 'DistanceAtAlert is required'],
      min: 0,
    },
  },
  { timestamps: false }
);

// Compound index - this is exactly what the throttle check queries on.
AlertSchema.index({ Vendor_ID: 1, Resident_ID: 1, Timestamp: -1 });

AlertSchema.virtual('Alert_ID').get(function () {
  return this._id;
});

AlertSchema.set('toJSON', { virtuals: true });
AlertSchema.set('toObject', { virtuals: true });

export default mongoose.model('Alert', AlertSchema);
