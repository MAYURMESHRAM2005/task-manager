const mongoose = require('mongoose');
const env = require('./env');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;

  if (!env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined. Check your .env file.');
  }

  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      // Mongoose 8 uses these defaults automatically, but explicit for clarity
    });

    isConnected = true;

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err.message);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected');
      isConnected = false;
    });

    if (env.NODE_ENV !== 'test') {
      console.log(`MongoDB Atlas connected: ${conn.connection.host}/${conn.connection.name}`);
    }
  } catch (error) {
    isConnected = false;
    console.error('MongoDB Atlas connection failed:', error.message);
    throw error;
  }
};

const disconnectDB = async () => {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  if (env.NODE_ENV !== 'test') {
    console.log('MongoDB disconnected');
  }
};

const checkDBHealth = () => {
  // Check both our flag and actual mongoose readyState (readyState 1 = connected)
  const connected = isConnected || mongoose.connection.readyState === 1;
  return {
    connected,
    readyState: mongoose.connection.readyState,
  };
};

module.exports = { connectDB, disconnectDB, checkDBHealth };
