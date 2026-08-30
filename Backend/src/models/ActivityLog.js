import mongoose from 'mongoose';

const { Schema } = mongoose;

const ActivityLogSchema = new Schema(
  {
    Vendor_ID: {
      type: Schema.Types.ObjectId,
      ref: 'Vendor',
      required: [true, 'Vendor_ID is required'],
      index: true,
    },

    Event: {
      type: String,
      required: [true, 'Event is required'],
      trim: true,
      maxlength: 100,
    },

    Description: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },

    EventTime: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: false }
);

ActivityLogSchema.index({ Vendor_ID: 1, EventTime: -1 });

ActivityLogSchema.virtual('Log_ID').get(function () {
  return this._id;
});

ActivityLogSchema.set('toJSON', { virtuals: true });
ActivityLogSchema.set('toObject', { virtuals: true });

export default mongoose.model('ActivityLog', ActivityLogSchema);
