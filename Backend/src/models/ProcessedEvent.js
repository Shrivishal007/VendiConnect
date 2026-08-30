import mongoose from 'mongoose';

const { Schema } = mongoose;

const PROCESSED_EVENT_TTL_HOURS = parseInt(process.env.PROCESSED_EVENT_TTL_HOURS, 10) || 24;

const ProcessedEventSchema = new Schema(
  {
    MessageId: {
      type: String,
      required: [true, 'MessageId is required'],
      unique: true,
      index: true,
    },

    ReceivedAt: {
      type: Date,
      default: Date.now,
    },

    ExpiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + PROCESSED_EVENT_TTL_HOURS * 60 * 60 * 1000),
    },
  },
  { timestamps: false }
);

ProcessedEventSchema.index({ ExpiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('ProcessedEvent', ProcessedEventSchema);
