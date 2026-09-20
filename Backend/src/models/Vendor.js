import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema(
  {
    Name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 100,
    },

    Phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      index: true,
    },

    Vehicle: {
      type: String,
      trim: true,
      default: 'Push Cart',
    },

    Status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
      default: 'INACTIVE',
      index: true,
    },

    AvgRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },

    RatingCount: {
      type: Number,
      min: 0,
      default: 0,
    },

    Category_ID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category ID is required'],
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Vendor', vendorSchema);
