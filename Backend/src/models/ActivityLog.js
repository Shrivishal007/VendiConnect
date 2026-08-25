/**
 * models/ActivityLog.js  *** NEW - aligns backend with ER diagram ***
 * -----------------------------------------------------------------------
 * Matches the `ActivityLog` entity in your ER/relational schema slides
 * (Log_ID, Vendor_ID, Event, Description, EventTime) and the "Activity
 * Log Dataset" example table on slide 8, which literally uses
 * "Location Updated" as its example Event value - see
 * services/activityLogService.js for where that gets written.
 *
 * Purely an append-only audit trail - nothing reads from this to drive
 * business logic (unlike Alert, which the throttle engine depends on),
 * so it's safe to write to fire-and-forget without risking correctness
 * elsewhere in the system.
 * -----------------------------------------------------------------------
 */

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
      // Not a hard enum - kept open-ended so new event types (e.g. a
      // future "Rating Received", "Consent Revoked") don't need a schema
      // migration. Known values are documented in activityLogService.js.
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

// Supports "most recent activity for this vendor" reads efficiently.
ActivityLogSchema.index({ Vendor_ID: 1, EventTime: -1 });

ActivityLogSchema.virtual('Log_ID').get(function () {
  return this._id;
});

ActivityLogSchema.set('toJSON', { virtuals: true });
ActivityLogSchema.set('toObject', { virtuals: true });

export default mongoose.model('ActivityLog', ActivityLogSchema);
