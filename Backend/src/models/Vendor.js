/**
 * models/Vendor.js
 * -----------------------------------------------------------------------
 * Static vendor profile. Live location lives separately in
 * VendorLocation.js so fast-changing geo data doesn't rewrite this doc.
 * AvgRating/RatingCount are denormalized here and kept in sync by
 * services/ratingService.js whenever a Rating is written (Week 4).
 * -----------------------------------------------------------------------
 */

import mongoose from 'mongoose';

const { Schema } = mongoose;

const VendorSchema = new Schema(
  {
    VendorName: {
      type: String,
      required: [true, 'VendorName is required'],
      trim: true,
      maxlength: 100,
    },

    PhoneHash: {
      type: String,
      required: [true, 'PhoneHash is required'],
      unique: true,
      index: true,
    },

    Vehicle: {
      type: String,
      trim: true,
      default: 'Pushcart',
    },

    Status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
      default: 'INACTIVE',
      index: true,
    },

    // Denormalized - recalculated by ratingService.recalculateAvgRating()
    // every time a Rating is inserted/updated (Week 4 aggregation trigger).
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
  { timestamps: true }
);

VendorSchema.virtual('Vendor_ID').get(function () {
  return this._id;
});

VendorSchema.set('toJSON', { virtuals: true });
VendorSchema.set('toObject', { virtuals: true });

export default mongoose.model('Vendor', VendorSchema);
