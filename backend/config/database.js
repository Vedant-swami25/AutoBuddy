const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/autobuddy";
mongoose.set("bufferCommands", false);

async function connectDatabase() {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 3000
    });
    console.log("MongoDB connected successfully");
    return true;
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    console.warn("Continuing with bundled fallback data for map and booking flows.");
    return false;
  }
}

module.exports = { connectDatabase, mongoose };
