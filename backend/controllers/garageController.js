const Garage = require("../models/Garage");
const fallbackGarages = require("../data/garages.json");

/**
 * Garage request handlers.
 */
function buildGarageDocument(payload) {
  return new Garage({
    id: `GAR-${Date.now()}`,
    name: payload.name || "New Garage",
    address: payload.address || payload.location || "",
    lat: payload.lat || 0,
    lng: payload.lng || 0,
    city: payload.location || payload.city || "",
    verified: payload.verified || false,
    rating: payload.rating || 4.2,
    etaMinutes: payload.etaMinutes || 32,
    phone: payload.phone || "+91 98765 43210",
    hours: payload.hours || "9:00 AM - 8:00 PM",
    mechanic: payload.mechanic || "AutoBuddy Partner",
    vehicle: payload.vehicle || "Service Bike",
    services: payload.services || payload.specialties || ["General Repairs", "Inspection"],
    vehicleTypes: payload.vehicleTypes || ["Car", "Bike"],
    image: payload.image || "assets/images/garage-placeholder.svg",
    specialties: payload.specialties || ["General Repairs", "Inspection"]
  });
}

async function listGarages(_req, res) {
  try {
    const garages = await Garage.find().sort({ createdAt: -1 });
    if (!garages.length) {
      return res.json(fallbackGarages);
    }
    return res.json(garages);
  } catch (error) {
    console.error("Fetch garages error:", error);
    return res.json(fallbackGarages);
  }
}

async function addGarage(req, res) {
  try {
    const newGarage = buildGarageDocument(req.body || {});
    await newGarage.save();

    return res.json({ message: "Request submitted", garage: newGarage });
  } catch (error) {
    console.error("Add garage error:", error);
    return res.status(500).json({ message: "Failed to add garage: " + error.message });
  }
}

async function getGarageById(req, res) {
  try {
    const garage = await Garage.findOne({ id: req.params.id });

    if (!garage) {
      return res.status(404).json({ message: "Garage not found" });
    }

    return res.json(garage);
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
