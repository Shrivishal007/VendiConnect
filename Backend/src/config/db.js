import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error('MONGO_URI is not defined in .env file');
    }

    await mongoose.connect(uri, { maxPoolSize: 10 });

    console.log(`[DB] MongoDB connected: ${mongoose.connection.host}`);

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
