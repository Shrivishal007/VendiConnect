/**
 * models/ResidentCategoryPreference.js  *** NEW - aligns backend with ER diagram ***
 * -----------------------------------------------------------------------
 * Many-to-many join between Resident and Category, matching the
 * `ResidentCategoryPreference` entity in your ER/relational schema
 * slides. Backs the "Category and Rating-based filtering" deliverable
 * listed on slide 12 - right now a resident has no way to express "only
 * alert me about Vegetable vendors," this is that mechanism.
 * -----------------------------------------------------------------------
 */

import mongoose from 'mongoose';

const { Schema } = mongoose;

const ResidentCategoryPreferenceSchema = new Schema(
  {
    Resident_ID: {
      type: Schema.Types.ObjectId,
      ref: 'Resident',
      required: [true, 'Resident_ID is required'],
      index: true,
    },

    Category_ID: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category_ID is required'],
      index: true,
    },
  },
  { timestamps: true }
);

// A resident can "prefer" a given category only once - matches the
// composite PK (Resident_ID, Category_ID) in the relational schema slide.
ResidentCategoryPreferenceSchema.index({ Resident_ID: 1, Category_ID: 1 }, { unique: true });

export default mongoose.model('ResidentCategoryPreference', ResidentCategoryPreferenceSchema);
