import mongoose from 'mongoose';

// Establish a MongoDB connection and monitor its status
const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error('MONGO_URI is not defined in .env file');
    }

    // Connect with a maximum of 10 pooled connections
    await mongoose.connect(uri, { maxPoolSize: 10 });

    console.log(`[DB] MongoDB connected: ${mongoose.connection.host}`);

    // Log connection interruptions and errors
    mongoose.connection.on('disconnected', () => {
      console.warn('[DB] MongoDB disconnected');
    });

    mongoose.connection.on('error', (err) => {
      console.error('[DB] MongoDB connection error: ', err.message);
    });
  } catch (err) {
    console.error('[DB] Failed to connect to MongoDB: ', err.message);
    process.exit(1);
  }
};

export default connectDB;
