/**
 * config/db.js
 * -----------------------------------------------------------------------
 * Establishes and exports the MongoDB Atlas connection using Mongoose.
 * ESM module - imported once from app.js at boot.
 * -----------------------------------------------------------------------
 */

import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;

    if (!uri) {
      throw new Error('MONGO_URI is not defined in environment variables');
    }

    await mongoose.connect(uri, {
      maxPoolSize: 10, // M0 free tier caps connections; keep this conservative
    });

    console.log(`[DB] MongoDB Atlas connected: ${mongoose.connection.host}`);

    mongoose.connection.on('disconnected', () => {
      console.warn('[DB] MongoDB disconnected');
    });

    mongoose.connection.on('error', (err) => {
      console.error('[DB] MongoDB connection error:', err.message);
    });
  } catch (err) {
    console.error('[DB] Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }
};

export default connectDB;
