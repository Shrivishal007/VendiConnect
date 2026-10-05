import mongoose from 'mongoose';

// One document per vendor-resident pair holding the time of the last alert.
// The unique index lets alertService claim a throttle slot atomically.
const AlertThrottleSchema = new mongoose.Schema(
  {
    Vendor_ID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: [true, 'Vendor ID is required'],
    },

    Resident_ID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resident',
      required: [true, 'Resident ID is required'],
    },

    LastAlertAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: false }
);

AlertThrottleSchema.index({ Vendor_ID: 1, Resident_ID: 1 }, { unique: true });

// Housekeeping only: must stay far longer than ALERT_THROTTLE_MINUTES
AlertThrottleSchema.index({ LastAlertAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

export default mongoose.model('AlertThrottle', AlertThrottleSchema);
