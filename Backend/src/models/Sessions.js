import mongoose from 'mongoose';

const SessionsSchema = new mongoose.Schema(
  {
    Vendor_ID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: [true, 'Vendor ID is required'],
      unique: true,
      index: true,
    },

    Phone: {
      type: String,
      required: [true, 'Phone number is required'],
      index: true,
    },

    Status: {
      type: String,
      enum: ['PENDING_CONSENT', 'ACTIVE', 'INACTIVE', 'REVOKED'],
      default: 'PENDING_CONSENT',
      index: true,
    },

    LastActive: {
      type: Date,
      default: Date.now,
    },

    Consent: {
      type: Boolean,
      default: false,
    },

    ConsentTimestamp: {
      type: Date,
      default: null,
    },

    ConsentWithdrawnAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: false }
);

export default mongoose.model('Sessions', SessionsSchema);
