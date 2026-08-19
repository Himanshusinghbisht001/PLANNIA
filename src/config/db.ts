import mongoose from 'mongoose';
import { env } from './env';

const MONGOOSE_OPTIONS: mongoose.ConnectOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

let isConnected = false;

/**
 * Connect to MongoDB with retry logic.
 * Uses exponential backoff — max 5 attempts.
 */
export async function connectDB(attempt = 1): Promise<void> {
  if (isConnected) return;

  try {
    const conn = await mongoose.connect(env.MONGODB_URI, MONGOOSE_OPTIONS);
    isConnected = true;
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    const maxAttempts = 5;
    if (attempt >= maxAttempts) {
      console.error(`❌ MongoDB connection failed after ${maxAttempts} attempts. Exiting.`);
      process.exit(1);
    }

    const delay = Math.min(1000 * 2 ** attempt, 30_000);
    console.warn(`⚠️  MongoDB connection attempt ${attempt} failed. Retrying in ${delay / 1000}s...`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return connectDB(attempt + 1);
  }
}

/**
 * Gracefully close the MongoDB connection.
 * Called during server shutdown.
 */
export async function disconnectDB(): Promise<void> {
  if (!isConnected) return;
  await mongoose.connection.close();
  isConnected = false;
  console.log('🔌 MongoDB disconnected gracefully.');
}

// Log mongoose events in development
if (env.NODE_ENV === 'development') {
  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB disconnected.');
  });

  mongoose.connection.on('error', (err) => {
    // Never log the full URI — it may contain credentials
    console.error('❌ MongoDB error:', err.message);
  });
}
