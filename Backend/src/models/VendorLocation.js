import mongoose from 'mongoose';

const { Schema } = mongoose;

const LOCATION_TTL_MINUTES = parseInt(process.env.LOCATION_TTL_MINUTES, 10) || 30;

const VendorLocationSchema = new Schema(
  {
    Vendor_ID: {
      type: Schema.Types.ObjectId,
      ref: 'Vendor',
      required: [true, 'Vendor_ID is required'],
      unique: true,
      index: true,
    },

    geo: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (coords) =>
            Array.isArray(coords) &&
            coords.length === 2 &&
            coords[0] >= -180 &&
            coords[0] <= 180 &&
            coords[1] >= -90 &&
            coords[1] <= 90,
          message: 'geo.coordinates must be a valid [longitude, latitude] pair',
        },
      },
    },

    UpdatedAt: {
      type: Date,
      default: Date.now,
    },

    ExpiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + LOCATION_TTL_MINUTES * 60 * 1000),
    },
  },
  { timestamps: false }
);

VendorLocationSchema.index({ geo: '2dsphere' });
VendorLocationSchema.index({ ExpiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('VendorLocation', VendorLocationSchema);
