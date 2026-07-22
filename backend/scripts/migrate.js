const fs = require("fs");
const path = require("path");
const { connectDatabase, mongoose } = require("../config/database");
const Garage = require("../models/Garage");

async function migrateData() {
  try {
    await connectDatabase();
    console.log("Connected to MongoDB");

    // Migrate garage data only
    const garageDataPath = path.join(__dirname, "..", "data", "garages.json");
    if (fs.existsSync(garageDataPath)) {
      const garageData = JSON.parse(fs.readFileSync(garageDataPath, "utf8"));
      if (Array.isArray(garageData) && garageData.length > 0) {
        console.log(`Migrating ${garageData.length} garage records...`);
        for (const entry of garageData) {
          const exists = await Garage.findOne({ id: entry.id });
          if (!exists) {
            const garage = new Garage(entry);
            await garage.save();
          }
        }
        console.log("✓ Garage data migrated successfully");
      }
    } else {
      console.log("No garage data to migrate");
    }

    console.log("\nMigration completed successfully");
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrateData();
