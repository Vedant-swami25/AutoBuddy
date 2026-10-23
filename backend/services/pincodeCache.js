const fs = require("fs");
const path = require("path");

/**
 * Small file-backed cache for pincode lookups.
 *
 * The controller owns HTTP behavior; this service owns cache persistence.
 */
const cachePath = path.join(__dirname, "..", "data", "pincode-cache.json");

let inMemoryPincodeCache = {};

function readCache() {
  try {
    if (!fs.existsSync(cachePath)) {
      try {
        fs.writeFileSync(cachePath, "{}");
      } catch (_) {
        // Read-only filesystem
      }
      return inMemoryPincodeCache;
    }

    const raw = fs.readFileSync(cachePath, "utf8").trim();
    return raw ? JSON.parse(raw) : inMemoryPincodeCache;
  } catch (_) {
    return inMemoryPincodeCache;
  }
}

function writeCache(cache) {
  inMemoryPincodeCache = cache;
  try {
    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
  } catch (err) {
    // Gracefully ignore write errors on read-only serverless filesystems
  }
}

function getPincodeFromCache(pincode) {
  return readCache()[pincode] || inMemoryPincodeCache[pincode] || null;
}

function savePincodeToCache(pincode, entry) {
  const cache = readCache();
  cache[pincode] = entry;
  writeCache(cache);
}

module.exports = {
  getPincodeFromCache,
  savePincodeToCache
};
