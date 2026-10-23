import mongoose from 'mongoose';

// Define the vendor profile, status, category, and rating details
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

    // Specify the vendor's vehicle type
    Vehicle: {
      type: String,
      trim: true,
      default: 'Push Cart',
    },

    // Track whether the vendor is active, inactive, or suspended
    Status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
      default: 'INACTIVE',
      index: true,
    },

    // Store the vendor's average customer rating
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

    // Vendor preferred communication language
    Language: {
      type: String,
      enum: ['ta', 'en'],
      default: 'en',
    },

    // Persistent location-sharing consent state
    LocationConsent: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Timestamp when location consent was granted or declined
    ConsentTimestamp: {
      type: Date,
      default: null,
    },

    // Registration channel
    RegisteredVia: {
      type: String,
      enum: ['WHATSAPP', 'WEB', 'ADMIN', 'SEED'],
      default: 'WHATSAPP',
    },

    // Timestamp of last location update ingested
    LastLocationUpdate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Optimize queries filtering vendors by status and category
vendorSchema.index({ Status: 1, Category_ID: 1 });

// Optimize queries sorting vendors by average rating within each status
vendorSchema.index({ Status: 1, AvgRating: -1 });

export default mongoose.model('Vendor', vendorSchema);
