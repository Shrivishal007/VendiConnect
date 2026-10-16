/**
 * models/Vendor.js
 * -----------------------------------------------------------------------
 * Represents a street vendor's static profile. Live location is
 * deliberately NOT stored here - see models/VendorLocation.js - so that
 * the fast-changing, TTL-expiring geo data is isolated from the vendor's
 * stable identity/profile data. This keeps the Vendor collection small
 * and avoids re-writing the whole vendor document on every location ping.
 * -----------------------------------------------------------------------
 */

import mongoose from 'mongoose';
const { Schema } = mongoose;

const VendorSchema = new Schema(
  {
    // Vendor_ID: Mongoose provides `_id` automatically (ObjectId).
    // Exposed as a virtual alias `Vendor_ID` to match the ER diagram
    // naming without duplicating the primary key field.

    VendorName: {
      type: String,
      required: [true, 'VendorName is required'],
      trim: true,
      maxlength: 100,
    },

    // Hashed representation of the vendor's WhatsApp phone number.
    // Raw numbers are never persisted - see utils/geoPrivacy.hashPhoneNumber.
    PhoneHash: {
      type: String,
      required: [true, 'PhoneHash is required'],
      unique: true,
      index: true,
    },

    Vehicle: {
      type: String, // e.g. "Pushcart", "Cycle", "Auto-rickshaw"
      trim: true,
      default: 'Pushcart',
    },

    Status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
      default: 'INACTIVE',
      index: true,
    },

    Language: {
      type: String,
      enum: ['en', 'ta'],
      default: 'en',
    },

    LocationConsent: {
      type: Boolean,
      default: false,
    },

    // Denormalized average rating for fast read on map/list views.
    // Trade-off (per project notes): avoids an aggregation join against
    // the Rating collection on every proximity query. Must be
    // recalculated whenever a new Rating is written (see Rating model
    // comment / a post-save hook or service-layer responsibility).
    AvgRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },

    RatingCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    Category_ID: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category_ID is required'],
      index: true,
    },
  },
  {
    timestamps: true, // adds createdAt / updatedAt
  }
);

// Virtual alias so API responses can expose `Vendor_ID` matching the ER
// diagram, while MongoDB still uses its native `_id`.
VendorSchema.virtual('Vendor_ID').get(function () {
  return this._id;
});

VendorSchema.set('toJSON', { virtuals: true });
VendorSchema.set('toObject', { virtuals: true });

const Vendor = mongoose.model('Vendor', VendorSchema);

export default Vendor;
