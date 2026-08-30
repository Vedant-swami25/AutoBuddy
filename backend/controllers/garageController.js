const Garage = require("../models/Garage");
const fallbackGarages = require("../data/garages.json");

function escapeRegex(text) {
  return String(text || "").replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

function buildGarageDocument(payload) {
  return new Garage({
    id: payload.id || `GAR-${Date.now()}`,
    name: String(payload.name || "New Garage").trim(),
    address: payload.address || payload.location || "Pune, Maharashtra",
    lat: payload.lat || 18.5204,
    lng: payload.lng || 73.8567,
    city: payload.city || payload.location || "Pune",
    verified: payload.verified !== undefined ? payload.verified : true,
    rating: payload.rating || 4.8,
    etaMinutes: payload.etaMinutes || 15,
    phone: payload.phone || "+91 98220 11000",
    hours: payload.hours || "8:00 AM - 9:00 PM",
    mechanic: String(payload.mechanic || payload.ownerName || "AutoBuddy Partner").trim(),
    ownerName: String(payload.ownerName || payload.mechanic || "AutoBuddy Partner").trim(),
    vehicle: payload.vehicle || "Service Van",
    services: payload.services || payload.specialties || ["General Service", "Oil Change", "Brake Repair", "Diagnostics"],
    vehicleTypes: payload.vehicleTypes || ["Car", "Bike", "SUV"],
    image: payload.image || "assets/images/garage-placeholder.svg",
    specialties: payload.specialties || ["General Service", "Diagnostics"],
    available: true
  });
}

const AUTOBUDDY_SUPPORT_PHONE = "+91 1800-889-2889";

function sanitizeGarageForCustomer(garage, isPrivileged = false) {
  const doc = garage.toObject ? garage.toObject() : { ...garage };
  if (isPrivileged) {
    return doc;
  }
  return {
    id: doc.id,
    name: doc.name,
    address: doc.address,
    lat: doc.lat,
    lng: doc.lng,
    city: doc.city,
    verified: doc.verified,
    rating: doc.rating,
    etaMinutes: doc.etaMinutes,
    hours: doc.hours,
    mechanic: doc.mechanic || doc.ownerName || "Certified Head Mechanic",
    services: doc.services,
    vehicleTypes: doc.vehicleTypes,
    image: doc.image,
    specialties: doc.specialties,
    available: doc.available,
    phone: AUTOBUDDY_SUPPORT_PHONE,
    supportPhone: AUTOBUDDY_SUPPORT_PHONE
  };
}

/**
 * List garages with strict deduplication by ID and Name+Phone.
 * Customers and guests receive sanitized privacy-safe contact info (AutoBuddy Support).
 */
async function listGarages(req, res) {
  try {
    const dbGarages = await Garage.find().sort({ createdAt: -1 });

    const seenIds = new Set();
    const seenNames = new Set();
    const uniqueGarages = [];

    const isPrivileged = req.user && req.user.role === "admin";

    // Helper to add unique garage
    function addUnique(garage) {
      const gId = String(garage.id || "");
      const normalizedName = String(garage.name || "").toLowerCase().trim();
      const phoneDigits = String(garage.phone || "").replace(/\D/g, "").slice(-10);
      const uniqueKey = `${normalizedName}|${phoneDigits}`;

      if (gId && seenIds.has(gId)) return;
      if (uniqueKey && seenNames.has(uniqueKey)) return;

      if (gId) seenIds.add(gId);
      if (uniqueKey) seenNames.add(uniqueKey);

      const isOwnerOfGarage = req.user && req.user.role === "garage_owner" && req.user.garageId === gId;
      uniqueGarages.push(sanitizeGarageForCustomer(garage, isPrivileged || isOwnerOfGarage));
    }

    dbGarages.forEach(addUnique);
    fallbackGarages.forEach(addUnique);

    return res.json(uniqueGarages);
  } catch (error) {
    console.error("Fetch garages error:", error);
    return res.json(fallbackGarages.map((g) => sanitizeGarageForCustomer(g, false)));
  }
}

async function addGarage(req, res) {
  try {
    const payload = req.body || {};
    const name = String(payload.name || "").trim();
    const phone = String(payload.phone || "").trim();

    if (!name) {
      return res.status(400).json({ message: "Garage name is required." });
    }

    // Check for duplicate
    const existing = await Garage.findOne({
      name: new RegExp("^" + escapeRegex(name) + "$", "i"),
      phone: phone || "+91 98220 11000"
    });

    if (existing) {
      return res.status(409).json({ message: "Garage already exists with this name and phone number." });
    }

    const newGarage = buildGarageDocument(payload);
    await newGarage.save();

    return res.json({ message: "Garage registered successfully", garage: newGarage });
  } catch (error) {
    console.error("Add garage error:", error);
    return res.status(500).json({ message: "Failed to add garage: " + error.message });
  }
}

async function getGarageById(req, res) {
  try {
    let garage = await Garage.findOne({ id: req.params.id });

    if (!garage) {
      garage = fallbackGarages.find((g) => g.id === req.params.id);
    }

    if (!garage) {
      return res.status(404).json({ message: "Garage not found" });
    }

    const isPrivileged = req.user && (
      req.user.role === "admin" ||
      (req.user.role === "garage_owner" && req.user.garageId === garage.id)
    );

    return res.json(sanitizeGarageForCustomer(garage, isPrivileged));
  } catch (error) {
    console.error("Fetch garage error:", error);
    return res.status(500).json({ message: "Failed to fetch garage: " + error.message });
  }
}

module.exports = {
  addGarage,
  getGarageById,
  listGarages
};
