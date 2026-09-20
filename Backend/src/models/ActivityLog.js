import mongoose from 'mongoose';

const ActivityLogsSchema = new mongoose.Schema(
  {
    Vendor_ID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: [true, 'Vendor ID is required'],
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

ActivityLogsSchema.index({ Vendor_ID: 1, EventTime: -1 });

export default mongoose.model('ActivityLogs', ActivityLogsSchema);
