/**
 * models/Rating.js
 * -----------------------------------------------------------------------
 * A single resident's rating/review of a vendor. Vendor.AvgRating /
 * Vendor.RatingCount are denormalized caches derived FROM this
 * collection (see Vendor.js comment on the trade-off). Whenever a Rating
 * is created/updated/deleted, the owning service layer is responsible
 * for recomputing and writing back Vendor.AvgRating - that recalculation
 * logic belongs in a ratingService/controller, not in this schema file,
 * to keep the model layer free of side effects.
 * -----------------------------------------------------------------------
 */

import mongoose from 'mongoose';
const { Schema } = mongoose;

const RatingSchema = new Schema(
  {
    // Rating_ID: exposed via `_id` (see virtual below).

    Vendor_ID: {
      type: Schema.Types.ObjectId,
      ref: 'Vendor',
      required: [true, 'Vendor_ID is required'],
      index: true,
    },

    Resident_ID: {
      type: Schema.Types.ObjectId,
      ref: 'Resident',
      required: [true, 'Resident_ID is required'],
      index: true,
    },

    RatingValue: {
      type: Number,
      required: [true, 'RatingValue is required'],
      min: 1,
      max: 5,
    },

    Review: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },

    RatingDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

// A resident may rate a given vendor only once - enforce with a unique
// compound index. Application layer should treat a duplicate as an
// "update existing rating" operation (findOneAndUpdate/upsert) rather
// than blindly inserting and catching the E11000 error.
RatingSchema.index({ Vendor_ID: 1, Resident_ID: 1 }, { unique: true });

RatingSchema.virtual('Rating_ID').get(function () {
  return this._id;
});

RatingSchema.set('toJSON', { virtuals: true });
RatingSchema.set('toObject', { virtuals: true });

const Rating = mongoose.model('Rating', RatingSchema);

export default Rating;
