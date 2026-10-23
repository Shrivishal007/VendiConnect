import mongoose from 'mongoose';

const botSessionSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    step: {
      type: String,
      enum: [
        'IDLE',
        'LANGUAGE_SELECT',
        'SHOP_NAME',
        'CATEGORY_SELECT',
        'VEHICLE_SELECT',
        'LOCATION_CONSENT',
        'AWAITING_LOCATION',
        'REGISTERED',
      ],
      default: 'IDLE',
      index: true,
    },

    language: {
      type: String,
      enum: ['ta', 'en'],
      default: 'en',
    },

    draft: {
      shopName: { type: String, default: '' },
      categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
      categoryName: { type: String, default: '' },
      vehicle: { type: String, default: '' },
      consent: { type: Boolean, default: null },
    },

    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      default: null,
      index: true,
    },

    lastActive: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

botSessionSchema.index({ phone: 1, step: 1 });

export default mongoose.model('BotSession', botSessionSchema);
