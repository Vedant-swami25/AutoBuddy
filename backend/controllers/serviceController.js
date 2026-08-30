const Service = require("../models/Service");
const fallbackServices = require("../data/services.json");

/**
 * Controller for Service Catalog with strict vehicle type filtering (car, bike, both).
 */
async function listServices(req, res) {
  try {
    const { vehicle } = req.query;
    const requestedVehicle = String(vehicle || "").toLowerCase().trim();

    let query = {};
    if (requestedVehicle === "car") {
      query.vehicleType = { $in: ["car", "both"] };
    } else if (requestedVehicle === "bike") {
      query.vehicleType = { $in: ["bike", "both"] };
    }

    let services = await Service.find(query).sort({ id: 1 });

    if (!services || services.length === 0) {
      // Seed or fallback to services.json
      if (requestedVehicle === "car") {
        services = fallbackServices.filter((s) => s.vehicleType === "car" || s.vehicleType === "both");
      } else if (requestedVehicle === "bike") {
        services = fallbackServices.filter((s) => s.vehicleType === "bike" || s.vehicleType === "both");
      } else {
        services = fallbackServices;
      }
    }

    return res.json(services);
  } catch (error) {
    console.error("List services error:", error);
    return res.json(fallbackServices);
  }
}

async function getServiceById(req, res) {
  try {
    const { id } = req.params;
    const { vehicle } = req.query;

    let service = await Service.findOne({ id });
    if (!service) {
      service = fallbackServices.find((s) => s.id === id);
    }

    if (!service) {
      return res.status(404).json({ message: "Service not found." });
    }

    const requestedVehicle = String(vehicle || "").toLowerCase().trim();
    if (requestedVehicle && service.vehicleType !== "both" && service.vehicleType !== requestedVehicle) {
      return res.status(400).json({
        message: `Service '${service.name}' is not compatible with ${requestedVehicle}s.`
      });
    }

    return res.json(service);
  } catch (error) {
    console.error("Get service error:", error);
    return res.status(500).json({ message: "Failed to fetch service: " + error.message });
  }
}

module.exports = {
  getServiceById,
  listServices
};
