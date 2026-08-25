/**
 * models/AdminUser.js  *** NEW THIS WEEK ***
 * -----------------------------------------------------------------------
 * Backs the admin dashboard's login (POST /api/admin/login) and the
 * JWT-protected routes that follow it. Passwords are never stored in
 * plaintext - `PasswordHash` is a bcrypt hash, set via the static helper
 * below rather than assigned directly, so callers can't accidentally
 * bypass hashing.
 * -----------------------------------------------------------------------
 */

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const { Schema } = mongoose;

const SALT_ROUNDS = 12; // bcrypt work factor - 12 is a solid default for 2026 hardware

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
      select: false, // excluded from queries by default - must opt in with .select('+PasswordHash')
    },

    Role: {
      type: String,
      enum: ['SUPER_ADMIN', 'OPERATIONS', 'SUPPORT'],
      default: 'OPERATIONS',
    },
  },
  { timestamps: true }
);

/**
 * Instance method: compares a plaintext candidate password against this
 * admin's stored bcrypt hash. Requires the document to have been fetched
 * with `.select('+PasswordHash')` since the field is `select: false`.
 * @param {string} candidatePassword
 * @returns {Promise<boolean>}
 */
AdminUserSchema.methods.comparePassword = async function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.PasswordHash);
};

/**
 * Static helper: hashes a plaintext password with bcrypt. Use this when
 * creating/seeding admin users so hashing logic lives in one place.
 * @param {string} plaintextPassword
 * @returns {Promise<string>}
 */
AdminUserSchema.statics.hashPassword = async function hashPassword(plaintextPassword) {
  return bcrypt.hash(plaintextPassword, SALT_ROUNDS);
};

AdminUserSchema.virtual('AdminUser_ID').get(function () {
  return this._id;
});

AdminUserSchema.set('toJSON', { virtuals: true });
AdminUserSchema.set('toObject', { virtuals: true });

export default mongoose.model('AdminUser', AdminUserSchema);
