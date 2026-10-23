import mongoose from 'mongoose';

// Define vendor sessions with consent and activity tracking
const SessionsSchema = new mongoose.Schema(
  {
    Vendor_ID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: [true, 'Vendor ID is required'],
      unique: true,
      index: true,
    },

    // Store the hashed phone number associated with the vendor session
    Phone: {
      type: String,
      required: [true, 'Phone number is required'],
      index: true,
    },

    // Track the current consent state of the vendor session
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

    // Record whether the vendor has granted location-sharing consent
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

// Optimize queries that filter sessions by status and consent
SessionsSchema.index({ Status: 1, Consent: 1 });

export default mongoose.model('Sessions', SessionsSchema);
