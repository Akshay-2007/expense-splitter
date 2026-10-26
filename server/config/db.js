const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const seedData = require('./seed');

let mongodInstance = null;

/**
 * Connect to MongoDB.
 * Attempts to connect to local/configured MONGO_URI first.
 * If unavailable, falls back to MongoMemoryServer for a zero-configuration, instant out-of-the-box experience.
 */
const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/expense-splitter';

  try {
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
    console.log(`Connected to MongoDB successfully: ${conn.connection.host}`);
    await seedData();
  } catch (error) {
    console.log('Local/Remote MongoDB not reachable. Initializing in-memory MongoDB server...');
    try {
      mongodInstance = await MongoMemoryServer.create();
      const memoryUri = mongodInstance.getUri();
      const conn = await mongoose.connect(memoryUri);
      console.log(`Connected to In-Memory MongoDB successfully: ${memoryUri}`);
      await seedData();
    } catch (memErr) {
      console.error(`Failed to start In-Memory MongoDB: ${memErr.message}`);
      process.exit(1);
    }
  }
};

module.exports = connectDB;
