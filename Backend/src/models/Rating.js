import mongoose from 'mongoose';

const { Schema } = mongoose;

const RatingSchema = new Schema(
  {
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
  { timestamps: false }
);

RatingSchema.index({ Vendor_ID: 1, Resident_ID: 1 }, { unique: true });

RatingSchema.virtual('Rating_ID').get(function () {
  return this._id;
});

RatingSchema.set('toJSON', { virtuals: true });
RatingSchema.set('toObject', { virtuals: true });

export default mongoose.model('Rating', RatingSchema);
