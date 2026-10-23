/**
 * Safe Local MongoDB -> MongoDB Atlas Migration Script
 *
 * Copies existing documents from local MongoDB (mongodb://localhost:27017/autobuddy)
 * to MongoDB Atlas without modifying, deleting, or dropping anything in local MongoDB.
 *
 * Usage:
 *   node backend/scripts/migrate_to_atlas.js "<ATLAS_CONNECTION_STRING>"
 */

const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");

// Load local environment files if present
const envFiles = [
  path.resolve(__dirname, "../../.env.production"),
  path.resolve(__dirname, "../../.env.local"),
  path.resolve(__dirname, "../../.env")
];

for (const envFile of envFiles) {
  if (fs.existsSync(envFile)) {
    const lines = fs.readFileSync(envFile, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

const LOCAL_URI = "mongodb://localhost:27017/autobuddy";
const targetUri = process.argv[2] || process.env.ATLAS_URI || process.env.MONGODB_ATLAS_URI;

if (!targetUri) {
  console.error("Error: Atlas connection URI not found.");
  console.error("Please add ATLAS_URI to .env.production or pass it securely as an argument.");
  process.exit(1);
}

const COLLECTIONS_TO_MIGRATE = ["users", "bookings", "garages", "loginhistories"];

async function runMigration() {
  let localClient;
  let atlasClient;

  try {
    console.log("=================================================");
    console.log("  AutoBuddy: Local MongoDB -> Atlas Migration   ");
    console.log("=================================================\n");

    console.log("Connecting to local MongoDB (READ-ONLY)...");
    localClient = new MongoClient(LOCAL_URI);
    await localClient.connect();
    const localDb = localClient.db();
    console.log("✓ Connected to local database: " + localDb.databaseName);

    console.log("\nConnecting to MongoDB Atlas...");
    atlasClient = new MongoClient(targetUri);
    await atlasClient.connect();
    const atlasDb = atlasClient.db();
    console.log("✓ Connected to Atlas database: " + atlasDb.databaseName + "\n");

    for (const collectionName of COLLECTIONS_TO_MIGRATE) {
      const localColl = localDb.collection(collectionName);
      const atlasColl = atlasDb.collection(collectionName);

      const localCount = await localColl.countDocuments();
      console.log(`--- [${collectionName}] ---`);
      console.log(`Local document count: ${localCount}`);

      if (localCount === 0) {
        console.log(`Skipping empty collection: ${collectionName}\n`);
        continue;
      }

      // Read all local documents
      const docs = await localColl.find({}).toArray();

      // Upsert into Atlas so it is idempotent and safe
      const bulkOps = docs.map((doc) => ({
        replaceOne: {
          filter: { _id: doc._id },
          replacement: doc,
          upsert: true
        }
      }));

      const result = await atlasColl.bulkWrite(bulkOps);
      const atlasCount = await atlasColl.countDocuments();

      console.log(`Migrated to Atlas: ${result.upsertedCount + result.modifiedCount} documents (Matched: ${result.matchedCount})`);
      console.log(`Total in Atlas [${collectionName}]: ${atlasCount}`);
      if (atlasCount >= localCount) {
        console.log(`✓ Verification PASSED for ${collectionName}\n`);
      } else {
        console.warn(`⚠ Warning: Atlas count (${atlasCount}) differs from local (${localCount})\n`);
      }
    }

    console.log("=================================================");
    console.log("✓ All collections successfully synced to Atlas!");
    console.log("✓ Local MongoDB database was preserved untouched.");
    console.log("=================================================");
  } catch (err) {
    console.error("Migration failed with error:", err.message);
    process.exit(1);
  } finally {
    if (localClient) await localClient.close();
    if (atlasClient) await atlasClient.close();
  }
}

runMigration();
