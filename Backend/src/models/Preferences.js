import mongoose from 'mongoose';

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

preferencesSchema.index({ Resident_ID: 1, Category_ID: 1 }, { unique: true });

export default mongoose.model('Preferences', preferencesSchema);
