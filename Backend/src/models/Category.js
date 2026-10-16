/**
 * models/Category.js
 * -----------------------------------------------------------------------
 * Minimal supporting model for Vendor.Category_ID (e.g. "Vegetables",
 * "Fruits", "Street Food", "Ironing/Services"). Included here only
 * because Vendor references it - not one of the five core entities you
 * listed, so keep this lean and extend as needed.
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
    type: String, // maps to a frontend icon asset key
    trim: true,
  },
});

const Category = mongoose.model('Category', CategorySchema);

export default Category;
