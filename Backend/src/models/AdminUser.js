import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

const adminUserSchema = new mongoose.Schema(
  {
    Email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    Password: { type: String, required: [true, 'Password is required'], select: false },

    Role: { type: String, enum: ['SUPER_ADMIN', 'OPERATIONS', 'SUPPORT'], default: 'OPERATIONS' },
  },
  { timestamps: true }
);

adminUserSchema.methods.comparePassword = async function comparePassword(password) {
  return bcrypt.compare(password, this.Password);
};

adminUserSchema.statics.hashPassword = async (plainText) => {
  return bcrypt.hash(plainText, SALT_ROUNDS);
};

export default mongoose.model('AdminUser', adminUserSchema);
