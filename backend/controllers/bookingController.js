const Booking = require("../models/Booking");
const Garage = require("../models/Garage");
const { enrichBooking, getProgress } = require("../services/bookingTracking");
const { getCoordinatePair } = require("../utils/coordinates");

/**
 * Booking request handlers.
 *
 * Controllers keep HTTP behavior here while routes only describe endpoints.
 */
async function findRequestedGarage(payload) {
  if (payload.garageId) {
    const garage = await Garage.findOne({ id: payload.garageId });
    if (garage) {
      return garage;
    }
  }

  if (payload.garage) {
    return Garage.findOne({ name: payload.garage });
  }

  return null;
}

function buildBookingDocument(payload, garage) {
  const destination = getCoordinatePair(payload.lat, payload.lng);
  const garageCoordinates =
    getCoordinatePair(garage?.lat, garage?.lng) ||
    getCoordinatePair(payload.garageLat, payload.garageLng);

  return new Booking({
    id: `BK-${Date.now()}`,
    user: payload.user || {},
    service: payload.service || "General Support",
    price: payload.price || null,
    garageId: garage?.id || payload.garageId || null,
    garage: garage?.name || payload.garage || "AutoBuddy Mobile Team",
    city: garage?.city || payload.city || "",
    rating: garage?.rating || 4.7,
    travelMinutes: garage?.etaMinutes || payload.travelMinutes || 28,
    mechanic: garage?.mechanic || "Rahul",
    vehicle: garage?.vehicle || "AutoBuddy Service Van",
    phone: garage?.phone || "+91 98765 00000",
    garageLocation: {
      lat: garageCoordinates?.lat ?? null,
      lng: garageCoordinates?.lng ?? null
    },
    location: {
      lat: destination?.lat ?? null,
      lng: destination?.lng ?? null
    }
  });
}

async function createBooking(req, res) {
  try {
    const payload = req.body || {};
    const garage = await findRequestedGarage(payload);
    const booking = buildBookingDocument(payload, garage);

    await booking.save();

    return res.json({
      message: "Booking successful",
      booking: enrichBooking(booking)
    });
  } catch (error) {
    console.error("Booking error:", error);
    return res.status(500).json({ message: "Booking failed: " + error.message });
  }
}

async function listBookings(_req, res) {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    return res.json(bookings.map(enrichBooking));
  } catch (error) {
    console.error("Fetch bookings error:", error);
    return res.status(500).json({ message: "Failed to fetch bookings: " + error.message });
  }
}

async function getLatestBooking(req, res) {
  try {
    const { mobile } = req.query;
    const query = mobile ? { "user.mobile": mobile } : {};
    const latest = await Booking.findOne(query).sort({ createdAt: -1 });

    if (!latest) {
      return res.status(404).json({ message: "No bookings found" });
    }

    return res.json(enrichBooking(latest));
  } catch (error) {
    console.error("Fetch latest booking error:", error);
    return res.status(500).json({ message: "Failed to fetch latest booking: " + error.message });
  }
}

async function getBookingById(req, res) {
  try {
    const booking = await Booking.findOne({ id: req.params.id });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    return res.json(enrichBooking(booking));
  } catch (error) {
    console.error("Fetch booking error:", error);
    return res.status(500).json({ message: "Failed to fetch booking: " + error.message });
  }
}

async function cancelBooking(req, res) {
  try {
    const booking = await Booking.findOne({ id: req.params.id });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const { progress } = getProgress(booking);
    if (progress >= 0.5) {
      return res.status(400).json({ message: "Cannot cancel booking that is already in progress" });
    }

    booking.status = "cancelled";
    booking.updatedAt = new Date();
    await booking.save();

    return res.json({
      message: "Booking cancelled successfully",
      booking: enrichBooking(booking)
    });
  } catch (error) {
    console.error("Cancel booking error:", error);
    return res.status(500).json({ message: "Failed to cancel booking: " + error.message });
  }
}

module.exports = {
  cancelBooking,
  createBooking,
  getBookingById,
  getLatestBooking,
  listBookings
};
