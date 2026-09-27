import mongoose from 'mongoose';

// Alert when vendor is near resident
const AlertSchema = new mongoose.Schema(
  {
    Vendor_ID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: [true, 'Vendor ID is required'],
      index: true,
    },

    Resident_ID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resident',
      required: [true, 'Resident ID is required'],
      index: true,
    },

    Timestamp: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },

    EtaMinutes: {
      type: Number,
      required: [true, 'EtaMinutes is required'],
      min: 0,
    },

    DistanceAt: {
      type: Number,
      required: [true, 'DistanceAt is required'],
      min: 0,
    },
  },
  { timestamps: false }
);

// Compound indexes for common query patterns
AlertSchema.index({ Vendor_ID: 1, Resident_ID: 1, Timestamp: -1 });
AlertSchema.index({ Resident_ID: 1, Timestamp: -1 });

export default mongoose.model('Alert', AlertSchema);
