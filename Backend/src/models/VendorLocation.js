/**
 * models/VendorLocation.js
 * -----------------------------------------------------------------------
 * Stores each vendor's CURRENT approximate live location. One document
 * per vendor (upserted on every WhatsApp Live Location ping).
 *
 * Two indexes do the heavy lifting here:
 *
 * 1. `geo` -> 2dsphere index: enables MongoDB's $near / $geoWithin
 *    geospatial queries for "find vendors within X meters of resident".
 *
 * 2. `ExpiresAt` -> TTL index (expireAfterSeconds: 0): MongoDB's own
 *    background reaper deletes the document once ExpiresAt passes, so
 *    stale vendors silently disappear from proximity results 30 minutes
 *    after their last location update. This is why NO cron job is
 *    needed for auto-expiry - it's a native MongoDB mechanism.
 *    (Note: the TTL monitor sweeps roughly once every 60s, so expiry is
 *    "within a minute or so" of ExpiresAt, not to-the-second exact -
 *    fine for a 30 minute inactivity window.)
 * -----------------------------------------------------------------------
 */

import mongoose from 'mongoose';
const { Schema } = mongoose;

const LOCATION_TTL_MINUTES = parseInt(process.env.LOCATION_TTL_MINUTES, 10) || 30;

const VendorLocationSchema = new Schema(
  {
    Vendor_ID: {
      type: Schema.Types.ObjectId,
      ref: 'Vendor',
      required: [true, 'Vendor_ID is required'],
      unique: true, // one live-location doc per vendor; updates overwrite it
      index: true,
    },

    // GeoJSON Point - REQUIRED shape for a 2dsphere index.
    // coordinates: [longitude, latitude]  <-- note the order.
    // Populated via utils/geoPrivacy.toApproximateGeoPoint() so raw GPS
    // is truncated to a ~50-100m grid BEFORE it ever reaches this schema.
    geo: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [lng, lat]
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

    // TTL anchor field. Every time the vendor pings a new location, the
    // controller resets this to (now + LOCATION_TTL_MINUTES), which
    // "refreshes" the TTL countdown - see locationController.js.
    ExpiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + LOCATION_TTL_MINUTES * 60 * 1000),
    },
  },
  {
    timestamps: false, // we manage UpdatedAt manually; ExpiresAt drives TTL
  }
);

// 2dsphere index for proximity ($near) queries.
VendorLocationSchema.index({ geo: '2dsphere' });

// TTL index: MongoDB deletes the document once the current time passes
// the value stored in ExpiresAt. expireAfterSeconds: 0 means "expire
// exactly at the timestamp stored in the field" (as opposed to N seconds
// after a static field like createdAt).
VendorLocationSchema.index({ ExpiresAt: 1 }, { expireAfterSeconds: 0 });

const VendorLocation = mongoose.model('VendorLocation', VendorLocationSchema);

export default VendorLocation;
