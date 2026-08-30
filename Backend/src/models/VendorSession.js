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

    Consent: {
      type: Boolean,
      default: false,
    },

    ConsentTimestamp: {
      type: Date,
      default: null,
    },

    NoticeVersion: {
      type: String,
      default: null,
    },

    ConsentWithdrawnAt: {
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
