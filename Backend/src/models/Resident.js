/**
 * models/Resident.js
 * -----------------------------------------------------------------------
 * Resident profile. Raw phone numbers never persist here - only a hash
 * (see utils/geoPrivacy.hashPhoneNumber) - Firebase Phone Auth owns the
 * real number.
 *
 * *** MODIFIED (Week 3) ***
 * Added `FcmToken`: the device's Firebase Cloud Messaging registration
 * token, refreshed by the React Native app on login / token rotation.
 * Required for services/proximityWorker.js to actually deliver a push -
 * without it, a resident can be geospatially "in range" but unreachable.
 *
 * *** MODIFIED AGAIN - ER-diagram alignment pass ***
 * Added `Address`: present on the ER diagram's Resident entity but never
 * actually added here. Kept optional and purely descriptive/display-only
 * (e.g. "Anna Nagar" shown in the app) - it plays NO role in proximity
 * matching, which continues to run entirely on HomeLatitude/HomeLongitude.
 * -----------------------------------------------------------------------
 */

import mongoose from 'mongoose';

const { Schema } = mongoose;

const ResidentSchema = new Schema(
  {
    ResidentPhoneHash: {
      type: String,
      required: [true, 'ResidentPhoneHash is required'],
      unique: true,
      index: true,
    },

    FirebaseUID: {
      type: String,
      required: [true, 'FirebaseUID is required'],
      unique: true,
      index: true,
    },

    // NEW: FCM device token used by services/fcmService.js. Nullable
    // because a resident may exist before the frontend has registered
    // a token (e.g. mid-onboarding, notification permission denied).
    FcmToken: {
      type: String,
      default: null,
    },

    DisplayName: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    // Display-only free-text address (e.g. "Anna Nagar"). Not used for
    // any geospatial query - HomeLatitude/HomeLongitude remain the
    // source of truth for proximity matching.
    Address: {
      type: String,
      trim: true,
      maxlength: 200,
      default: '',
    },

    HomeLatitude: {
      type: Number,
      required: [true, 'HomeLatitude is required'],
      min: -90,
      max: 90,
    },

    HomeLongitude: {
      type: Number,
      required: [true, 'HomeLongitude is required'],
      min: -180,
      max: 180,
    },

    // Radius in METERS within which the resident wants proactive alerts.
    NotificationRadius: {
      type: Number,
      default: 500,
      min: 50,
      max: 5000,
    },
  },
  { timestamps: true }
);

ResidentSchema.virtual('Resident_ID').get(function () {
  return this._id;
});

ResidentSchema.set('toJSON', { virtuals: true });
ResidentSchema.set('toObject', { virtuals: true });

export default mongoose.model('Resident', ResidentSchema);
