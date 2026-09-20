import mongoose from 'mongoose';

const categoriesSchema = new mongoose.Schema({
  Name: {
    type: String,
    required: [true, 'Name is required'],
    unique: true,
    trim: true,
  },

  Icon: {
    type: String,
    trim: true,
  },
});

export default mongoose.model('Category', categoriesSchema);
