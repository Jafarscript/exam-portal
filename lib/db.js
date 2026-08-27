import mongoose from 'mongoose';

// Ensure all Mongoose models are registered with the connection
import './models';

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
    console.warn('[DB] MONGODB_URI environment variable is missing');
    return null;
  }
  if (!cached.promise) {
    const connectOptions = {
      bufferCommands: false,
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 15000,
    };
    if (process.env.MONGODB_DB) {
      connectOptions.dbName = process.env.MONGODB_DB;
    }

    cached.promise = mongoose
      .connect(uri, connectOptions)
      .then((m) => {
        console.log(`[DB] Connected successfully to MongoDB (database: "${m.connection.name}")`);
        return m;
      })
      .catch((err) => {
        console.warn('[DB] MongoDB connection error:', err.message);
        cached.promise = null;
        return null;
      });
  }
  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    console.warn('[DB] MongoDB not connected:', err.message);
    return null;
  }
  return cached.conn;
}

export default dbConnect;

