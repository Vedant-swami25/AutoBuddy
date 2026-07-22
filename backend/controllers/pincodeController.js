const { getPincodeFromCache, savePincodeToCache } = require("../services/pincodeCache");

/**
 * India Post pincode lookup handlers.
 */
const INDIA_POST_BASE_URL = "https://raw.githubusercontent.com/IndiaPost/pin/master/api/v01/json";
const PINCODE_LOOKUP_TIMEOUT_MS = 8000;

function normalizePincodeEntry(pincode, offices) {
  const primaryOffice = offices.find((office) => office.Deliverystatus === "Delivery") || offices[0];

  return {
    pincode,
    district: primaryOffice?.Districtname || "",
    state: primaryOffice?.statename || "",
    source: "India Post PIN directory",
    officeCount: offices.length
  };
}

function buildNotFoundResponse() {
  return {
    message: "We could not find location details for that pincode in the India Post directory."
  };
}

async function lookupPincode(req, res) {
  const { pincode } = req.params;

  if (!/^\d{6}$/.test(pincode)) {
    return res.status(400).json({ message: "Please enter a valid 6-digit pincode." });
  }

  const cachedEntry = getPincodeFromCache(pincode);
  if (cachedEntry) {
    return res.json(cachedEntry);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PINCODE_LOOKUP_TIMEOUT_MS);

  try {
    const response = await fetch(`${INDIA_POST_BASE_URL}/${pincode}.json`, {
      signal: controller.signal
    });

    if (!response.ok) {
      return res.status(404).json(buildNotFoundResponse());
    }

    const offices = await response.json();
    if (!Array.isArray(offices) || !offices.length) {
      return res.status(404).json(buildNotFoundResponse());
    }

    const normalized = normalizePincodeEntry(pincode, offices);
    savePincodeToCache(pincode, normalized);

    return res.json(normalized);
  } catch (error) {
    const message = error.name === "AbortError"
      ? "Pincode lookup timed out. Please try again."
      : "Pincode lookup failed. Please check your internet connection and try again.";

    return res.status(502).json({ message });
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { lookupPincode };
