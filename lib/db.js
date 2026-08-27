import mongoose from 'mongoose';

mongoose.set('bufferCommands', false);

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGOD_URI;

if (!MONGODB_URI) {
  console.warn('MONGODB_URI is not set. Set it in Settings > Environment Variables.');
}

// Reuse the connection across hot reloads / serverless invocations.
let cached = global._mongoose;
if (!cached) {
  cached = global._mongoose = { conn: null, promise: null };
}

export async function dbConnect() {
  const uri = process.env.MONGODB_URI || process.env.MONGOD_URI;
  if (cached.conn && mongoose.connection.readyState === 1) return cached.conn;
  if (!uri) {
    console.warn('MongoDB not connected — MONGODB_URI environment variable is missing');
    return null;
  }
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(uri, {
        bufferCommands: false,
        dbName: 'exam_portal',
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 15000,
      })
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

