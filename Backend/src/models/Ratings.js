import mongoose from 'mongoose';

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

ratingsSchema.index({ Resident_ID: 1, Vendor_ID: 1 }, { unique: true });

export default mongoose.model('Ratings', ratingsSchema);
