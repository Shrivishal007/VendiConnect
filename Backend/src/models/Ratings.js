import mongoose from 'mongoose';

// Resident ratings for vendors
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

    Review: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
  },
  { timestamps: false }
);

// Compound indexes for common query patterns
ratingsSchema.index({ Resident_ID: 1, Vendor_ID: 1 }, { unique: true });
ratingsSchema.index({ Vendor_ID: 1, RatingDate: -1 });

export default mongoose.model('Ratings', ratingsSchema);
