import mongoose from 'mongoose';

// Store the last alert timestamp for each vendor-resident pair
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

// Ensure each vendor-resident pair has only one throttle record
AlertThrottleSchema.index({ Vendor_ID: 1, Resident_ID: 1 }, { unique: true });

// Automatically remove old throttle records after seven days
AlertThrottleSchema.index({ LastAlertAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

export default mongoose.model('AlertThrottle', AlertThrottleSchema);
