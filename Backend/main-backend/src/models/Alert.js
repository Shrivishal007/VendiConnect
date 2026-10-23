import mongoose from 'mongoose';

// Define the schema for vendor proximity alerts sent to residents
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

    // Store the estimated walking time when the alert was sent
    EtaMinutes: {
      type: Number,
      required: [true, 'EtaMinutes is required'],
      min: 0,
    },

    // Store the vendor-resident distance in kilometers at alert time
    DistanceAt: {
      type: Number,
      required: [true, 'DistanceAt is required'],
      min: 0,
    },

    // In-app read status
    Read: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Notification type
    Type: {
      type: String,
      enum: ['PROXIMITY_ALERT', 'VENDOR_STATUS', 'SYSTEM'],
      default: 'PROXIMITY_ALERT',
    },

    // Notification delivery status
    DeliveryStatus: {
      type: String,
      enum: ['PENDING', 'DELIVERED', 'IN_APP', 'FAILED'],
      default: 'IN_APP',
    },
  },
  { timestamps: false }
);

// Optimize queries for vendor-resident alert history and resident timelines
AlertSchema.index({ Vendor_ID: 1, Resident_ID: 1, Timestamp: -1 });
AlertSchema.index({ Resident_ID: 1, Timestamp: -1 });

export default mongoose.model('Alert', AlertSchema);
