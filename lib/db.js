import mongoose from 'mongoose';

mongoose.set('bufferCommands', false);

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.warn('MONGODB_URI is not set. Set it in .env before running the app.');
}

// Reuse the connection across hot reloads / serverless invocations.
let cached = global._mongoose;
if (!cached) {
  cached = global._mongoose = { conn: null, promise: null };
}

export async function dbConnect() {
  if (cached.conn) return cached.conn;
  if (!MONGODB_URI) {
    console.warn('MongoDB not connected — MONGODB_URI environment variable is missing');
    return null;
  }
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, { bufferCommands: false })
      .then((m) => m)
      .catch((err) => {
        console.warn('MongoDB connection error:', err.message);
        cached.promise = null;
        return null;
      });
  }
  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    console.warn('MongoDB not connected:', err.message);
    return null;
  }
  return cached.conn;
}

export default dbConnect;

