import mongoose from 'mongoose';

// Resident user model with location and notification settings
const residentSchema = new mongoose.Schema(
  {
    Name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 100,
    },

    Email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
    },

    FirebaseUID: {
      type: String,
      required: [true, 'Firebase UID is required'],
      unique: true,
      index: true,
    },

    Latitude: {
      type: Number,
      min: -90,
      max: 90,
      default: null,
    },

    Longitude: {
      type: Number,
      min: -180,
      max: 180,
      default: null,
    },

    NotificationRadius: {
      type: Number,
      min: 50,
      max: 5000,
      default: 500,
    },

    Address: {
      type: String,
      default: '',
    },

    FcmToken: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index for residents with location set
residentSchema.index({ Latitude: 1, Longitude: 1 });

export default mongoose.model('Resident', residentSchema);
