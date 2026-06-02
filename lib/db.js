import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  throw new Error('Please define the MONGO_URI environment variable inside your .env file');
}

// Global caching forces Next.js hot-reloading to reuse the same database instance
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  // If we already have an active database instance, reuse it immediately
  if (cached.conn) {
    return cached.conn;
  }

  // If a connection process isn't already running, start one
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGO_URI, opts).then((mongooseInstance) => {
      console.log('MongoDB connected successfully');
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null; // Reset the promise cache if the connection fails
    throw e;
  }

  return cached.conn;
};

export default connectDB;