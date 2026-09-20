import mongoose from 'mongoose';

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
      min: 500,
      max: 5000,
      default: 500,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Resident', residentSchema);
