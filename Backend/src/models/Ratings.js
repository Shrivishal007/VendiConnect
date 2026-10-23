import mongoose from 'mongoose';

// Define resident ratings and reviews for vendors
const ratingsSchema = new mongoose.Schema(
  {
    Resident_ID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resident',
      required: [true, 'Resident ID required'],
      index: true,
    },

    Vendor_ID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: [true, 'Vendor ID required'],
      index: true,
    },

    // Restrict ratings to a five-star scale
    Rating: {
      type: Number,
      required: [true, 'Rating value is required'],
      min: 1,
      max: 5,
    },

    RatingDate: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // Optional written review for the vendor
    Review: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
  },
  { timestamps: false }
);

// Allow only one rating per resident-vendor pair
ratingsSchema.index({ Resident_ID: 1, Vendor_ID: 1 }, { unique: true });

// Optimize vendor rating history queries by date
ratingsSchema.index({ Vendor_ID: 1, RatingDate: -1 });

export default mongoose.model('Ratings', ratingsSchema);
