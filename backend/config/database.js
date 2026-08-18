const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/autobuddy";
mongoose.set("bufferCommands", false);

async function connectDatabase() {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 3000
    });
    console.log("MongoDB connected successfully");

    // Clean up any legacy unique index on email
    try {
      const collection = mongoose.connection.collection("users");
      const indexes = await collection.indexes();
      const emailIndex = indexes.find((idx) => idx.name === "email_1");
      if (emailIndex) {
        await collection.dropIndex("email_1");
        console.log("Cleaned up legacy email_1 unique index");
      }
    } catch (idxError) {
      // Ignore if index doesn't exist
    }

    return true;
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    console.warn("Continuing with bundled fallback data for map and booking flows.");
    return false;
  }
}

module.exports = { connectDatabase, mongoose };
