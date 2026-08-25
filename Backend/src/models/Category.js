/**
 * models/Category.js
 * -----------------------------------------------------------------------
 * Supporting lookup model referenced by Vendor.Category_ID
 * (e.g. "Vegetables", "Fruits", "Street Food").
 * -----------------------------------------------------------------------
 */

import mongoose from 'mongoose';

const { Schema } = mongoose;

const CategorySchema = new Schema({
  Name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  IconKey: {
    type: String,
    trim: true,
  },
});

export default mongoose.model('Category', CategorySchema);
