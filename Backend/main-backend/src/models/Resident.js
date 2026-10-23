import mongoose from 'mongoose';

// Define the resident profile, location, and notification settings
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
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
    },

    // Firebase Authentication UID used to identify resident sessions.
    FirebaseUID: {
      type: String,
      unique: true,
    },

    // Kept for legacy resident records; resident authentication uses FirebaseUID.
    PhoneHash: {
      type: String,
      sparse: true,
      index: true,
    },

    // Store the resident's latitude and longitude when available
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

    // Configure the distance within which vendor notifications are sent
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

    // Firebase Cloud Messaging token used for push notifications
    FcmToken: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Optimize queries that filter residents by latitude and longitude
residentSchema.index({ Latitude: 1, Longitude: 1 });

export default mongoose.model('Resident', residentSchema);
