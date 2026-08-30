import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const { Schema } = mongoose;

const SALT_ROUNDS = 12;

const AdminUserSchema = new Schema(
  {
    Email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    PasswordHash: {
      type: String,
      required: [true, 'PasswordHash is required'],
      select: false,
    },

    Role: {
      type: String,
      enum: ['SUPER_ADMIN', 'OPERATIONS', 'SUPPORT'],
      default: 'OPERATIONS',
    },
  },
  { timestamps: true }
);

AdminUserSchema.methods.comparePassword = async function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.PasswordHash);
};

AdminUserSchema.statics.hashPassword = async function hashPassword(plaintextPassword) {
  return bcrypt.hash(plaintextPassword, SALT_ROUNDS);
};

AdminUserSchema.virtual('AdminUser_ID').get(function () {
  return this._id;
});

AdminUserSchema.set('toJSON', { virtuals: true });
AdminUserSchema.set('toObject', { virtuals: true });

export default mongoose.model('AdminUser', AdminUserSchema);
