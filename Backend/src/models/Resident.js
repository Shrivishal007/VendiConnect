/**
 * models/Resident.js
 * -----------------------------------------------------------------------
 * Stores registered resident users.
 * -----------------------------------------------------------------------
 */

import mongoose from 'mongoose';

const residentSchema = new mongoose.Schema(
  {
    Name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    Phone: {
      type: String,
      required: [true, 'Phone is required'],
      unique: true,
      trim: true,
      // Store as '919384766429' format
    },
    Area: {
      type: String,
      default: 'GPS Detected Area',
      trim: true,
    },
    Latitude: {
      type: Number,
      default: 13.0835,
    },
    Longitude: {
      type: Number,
      default: 80.2720,
    },
    Flat: {
      type: String,
      trim: true,
      default: '',
    },
    // For future push notifications
    FCMToken: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

export default mongoose.model('Resident', residentSchema);
