/**
 * config/db.js
 * -----------------------------------------------------------------------
 * Establishes and exports the MongoDB Atlas connection using Mongoose.
 * Kept isolated from app.js so it can be re-used by scripts/tests.
 * -----------------------------------------------------------------------
 */

import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;

    if (!uri) {
      throw new Error('MONGO_URI is not defined in environment variables');
    }

    // Mongoose 8+ no longer needs useNewUrlParser/useUnifiedTopology flags,
    // they are defaults now. Left explicit options minimal for the free M0 tier.
    await mongoose.connect(uri, {
      maxPoolSize: 10, // M0 free tier caps connections; keep this conservative
    });

    console.log(`[DB] MongoDB Atlas connected: ${mongoose.connection.host}`);

    // Helpful visibility during development on an M0 cluster (slow cold starts etc.)
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
