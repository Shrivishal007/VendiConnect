import mongoose from 'mongoose';

const locationTTLMinutes = parseInt(process.env.LOCATION_TTL_MINUTES, 10) || 30;

const locationSchema = new mongoose.Schema(
  {
    Vendor_ID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: [true, 'Vendor ID is required'],
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
          validator: (coordinates) =>
            Array.isArray(coordinates) &&
            coordinates.length === 2 &&
            coordinates[0] >= -180 &&
            coordinates[0] <= 180 &&
            coordinates[1] >= -90 &&
            coordinates[1] <= 90,
          message: 'Coordinates must be a valid (long, lat) pair',
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
      default: () => new Date(Date.now() + locationTTLMinutes * 60 * 1000),
    },
  },
  { timestamps: false }
);

locationSchema.index({ geo: '2dsphere' });
locationSchema.index({ ExpiresAt: 1, expireAfterSeconds: 0 });

export default mongoose.model('Location', locationSchema);
