import mongoose from 'mongoose';

// Define the schema for vendor categories
const categoriesSchema = new mongoose.Schema({
  Name: {
    type: String,
    required: [true, 'Name is required'],
    unique: true,
    trim: true,
  },

  // Optional icon associated with the category
  Icon: {
    type: String,
    trim: true,
  },
});

export default mongoose.model('Category', categoriesSchema);
