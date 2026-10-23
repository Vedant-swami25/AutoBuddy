const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/autobuddy";
mongoose.set("bufferCommands", false);

async function connectDatabase() {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 3000
    });
    console.log("MongoDB connected successfully");

    // Clean up legacy single unique indexes to allow dual User and Garage Owner roles
    try {
      const collection = mongoose.connection.collection("users");
      const indexes = await collection.indexes();
      const emailIndex = indexes.find((idx) => idx.name === "email_1");
      if (emailIndex) {
        await collection.dropIndex("email_1");
      }
      const mobileIndex = indexes.find((idx) => idx.name === "mobile_1");
      if (mobileIndex) {
        await collection.dropIndex("mobile_1");
        console.log("Cleaned up legacy mobile_1 unique index to allow dual role accounts");
      }
      await collection.createIndex({ mobile: 1, role: 1 }, { unique: true });
    } catch (idxError) {
      // Ignore index errors
    }

    return true;
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    console.warn("Continuing with bundled fallback data for map and booking flows.");
    return false;
  }
}

module.exports = { connectDatabase, mongoose };
