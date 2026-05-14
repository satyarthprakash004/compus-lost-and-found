const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      // Mongoose 8 has these on by default, but explicit is clear
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ MongoDB connected:', mongoose.connection.host);
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
};

// Log disconnects in development
mongoose.connection.on('disconnected', () => {
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️  MongoDB disconnected');
  }
});

module.exports = connectDB;
