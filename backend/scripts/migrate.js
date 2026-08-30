const fs = require("fs");
const path = require("path");
const { connectDatabase, mongoose } = require("../config/database");
const Garage = require("../models/Garage");

async function migrateData() {
  try {
    await connectDatabase();
    console.log("Connected to MongoDB");

    const garageDataPath = path.join(__dirname, "..", "data", "garages.json");
    if (fs.existsSync(garageDataPath)) {
      const garageData = JSON.parse(fs.readFileSync(garageDataPath, "utf8"));
      if (Array.isArray(garageData) && garageData.length > 0) {
        console.log(`Syncing ${garageData.length} verified garage records...`);
        let inserted = 0;
        let updated = 0;

        for (const entry of garageData) {
          const existing = await Garage.findOne({ id: entry.id });
          if (!existing) {
            const garage = new Garage(entry);
            await garage.save();
            inserted++;
          } else {
            // Update metadata while preserving owner linkage if already set
            existing.name = entry.name;
            existing.address = entry.address;
            existing.lat = entry.lat;
            existing.lng = entry.lng;
            existing.city = entry.city;
            existing.verified = entry.verified;
            existing.rating = entry.rating;
            existing.etaMinutes = entry.etaMinutes;
            existing.phone = entry.phone;
            existing.hours = entry.hours;
            existing.mechanic = existing.mechanic || entry.mechanic;
            existing.services = entry.services;
            existing.vehicleTypes = entry.vehicleTypes;
            existing.specialties = entry.specialties;
            existing.available = true;
            existing.updatedAt = new Date();
            await existing.save();
            updated++;
          }
        }
        console.log(`✓ Sync complete: ${inserted} added, ${updated} verified/updated (Total: ${garageData.length} garages)`);
      }
    } else {
      console.log("No garage data found at " + garageDataPath);
    }

    const totalCount = await Garage.countDocuments();
    console.log(`Total verified garages in MongoDB: ${totalCount}`);

    console.log("\nMigration completed successfully");
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrateData();
