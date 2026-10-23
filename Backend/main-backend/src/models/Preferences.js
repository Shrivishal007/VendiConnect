import mongoose from 'mongoose';

// Define resident preferences for vendor categories
const preferencesSchema = new mongoose.Schema(
  {
    Resident_ID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resident',
      required: [true, 'Resident ID required'],
      index: true,
    },

    Category_ID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category ID required'],
      index: true,
    },
  },
  { timestamps: true }
);

// Prevent duplicate category preferences for the same resident
preferencesSchema.index({ Resident_ID: 1, Category_ID: 1 }, { unique: true });

export default mongoose.model('Preferences', preferencesSchema);
