import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

// Define the admin user schema with secure password hashing
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

    // Exclude passwords from query results by default
    Password: { type: String, required: [true, 'Password is required'], select: false },

    // Assign an administrative role with OPERATIONS as the default
    Role: { type: String, enum: ['SUPER_ADMIN', 'OPERATIONS', 'SUPPORT'], default: 'OPERATIONS' },
  },
  { timestamps: true }
);

// Compare a supplied password against the stored hash
adminUserSchema.methods.comparePassword = async function comparePassword(password) {
  return bcrypt.compare(password, this.Password);
};

// Hash a plain-text password using the configured bcrypt cost factor
adminUserSchema.statics.hashPassword = async (plainText) => {
  return bcrypt.hash(plainText, SALT_ROUNDS);
};

export default mongoose.model('AdminUser', adminUserSchema);
