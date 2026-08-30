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

    FcmToken: {
      type: String,
      default: null,
    },

    DisplayName: {
      type: String,
      trim: true,
      maxlength: 100,
    },

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
