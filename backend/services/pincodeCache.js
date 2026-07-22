const fs = require("fs");
const path = require("path");

/**
 * Small file-backed cache for pincode lookups.
 *
 * The controller owns HTTP behavior; this service owns cache persistence.
 */
const cachePath = path.join(__dirname, "..", "data", "pincode-cache.json");

function readCache() {
  if (!fs.existsSync(cachePath)) {
    fs.writeFileSync(cachePath, "{}");
    return {};
  }

  const raw = fs.readFileSync(cachePath, "utf8").trim();
  return raw ? JSON.parse(raw) : {};
}

function writeCache(cache) {
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
}

function getPincodeFromCache(pincode) {
  return readCache()[pincode] || null;
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
