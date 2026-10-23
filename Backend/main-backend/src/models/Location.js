import mongoose from 'mongoose';
import { requiredPositiveInteger } from '../config/env.js';

const locationTTLMinutes = requiredPositiveInteger('LOCATION_TTL_MINUTES');

// Store vendor locations with geospatial indexing and automatic expiration
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
        // Validate GeoJSON coordinates in [longitude, latitude] order
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

    // Set the location expiration time using the configured TTL
    ExpiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + locationTTLMinutes * 60 * 1000),
    },
  },
  { timestamps: false }
);

// Enable geospatial queries for nearby vendor searches
locationSchema.index({ geo: '2dsphere' });

// Automatically delete expired location documents
locationSchema.index({ ExpiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('Location', locationSchema);
