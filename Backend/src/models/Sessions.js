import mongoose from 'mongoose';

// Vendor session tracking with consent management
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
      enum: ['PENDING_CONSENT', 'ACTIVE', 'REVOKED'],
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
      index: true,
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

// Compound index for active sessions with consent
SessionsSchema.index({ Status: 1, Consent: 1 });

export default mongoose.model('Sessions', SessionsSchema);
