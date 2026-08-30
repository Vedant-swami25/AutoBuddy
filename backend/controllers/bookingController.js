const Booking = require("../models/Booking");
const Garage = require("../models/Garage");
const { enrichBooking, getProgress } = require("../services/bookingTracking");
const { calculateDistanceKm, getCoordinatePair } = require("../utils/coordinates");

/**
 * Finds the requested garage or calculates the nearest verified garage using Haversine distance.
 */
async function findRequestedGarage(payload) {
  if (payload.garageId) {
    const garage = await Garage.findOne({ id: payload.garageId, verified: true });
    if (garage) {
      return { garage, distanceKm: null };
    }
  }

  if (payload.garage) {
    const garage = await Garage.findOne({ name: payload.garage, verified: true });
    if (garage) {
      return { garage, distanceKm: null };
    }
  }

  // Calculate nearest verified garage based on customer coordinates
  const destination =
    getCoordinatePair(payload.lat, payload.lng) ||
    getCoordinatePair(payload.location?.lat, payload.location?.lng);

  if (destination) {
    const verifiedGarages = await Garage.find({ verified: true });
    if (verifiedGarages.length > 0) {
      let nearestGarage = null;
      let minDistance = Infinity;

      for (const g of verifiedGarages) {
        const dist = calculateDistanceKm(destination.lat, destination.lng, g.lat, g.lng);
        if (dist !== null && dist < minDistance) {
          minDistance = dist;
          nearestGarage = g;
        }
      }

      if (nearestGarage) {
        return { garage: nearestGarage, distanceKm: minDistance };
      }
    }
  }

  // Fallback to top-rated verified garage
  const defaultGarage = await Garage.findOne({ verified: true }).sort({ rating: -1, id: 1 });
  return { garage: defaultGarage || null, distanceKm: null };
}

const fallbackServices = require("../data/services.json");

function findServiceCompatibility(serviceName) {
  const normName = String(serviceName || "").toLowerCase().trim();
  const service = fallbackServices.find(
    (s) =>
      s.name.toLowerCase() === normName ||
      normName.includes(s.name.toLowerCase()) ||
      s.name.toLowerCase().includes(normName)
  );
  return service ? service.vehicleType : "both";
}

function buildBookingDocument(payload, garageData, user = null) {
  const garage = garageData?.garage || null;
  const distanceKm = garageData?.distanceKm ?? null;

  const destination = getCoordinatePair(payload.lat, payload.lng);
  const garageCoordinates =
    getCoordinatePair(garage?.lat, garage?.lng) ||
    getCoordinatePair(payload.garageLat, payload.garageLng);

  const customerName = user?.name || payload.user?.name || "Customer User";
  const customerMobile = user?.mobile || payload.user?.mobile || payload.mobile || "";
  const customerId = user?.id || payload.user?.id || null;
  const vehicleType = payload.vehicleType === "bike" ? "bike" : "car";

  let computedEta = garage?.etaMinutes || payload.travelMinutes || 20;
  if (distanceKm !== null && distanceKm >= 0) {
    computedEta = Math.max(4, Math.round(distanceKm * 4));
  }

  return new Booking({
    id: payload.id || `BK-${Date.now()}`,
    user: {
      id: customerId,
      name: customerName,
      mobile: customerMobile
    },
    service: payload.service || "Book Van",
    price: payload.price !== undefined ? Number(payload.price) : null,
    vehicleType,
    garageId: garage?.id || payload.garageId || null,
    garage: garage?.name || payload.garage || "AutoBuddy Verified Partner",
    city: garage?.city || payload.city || "Pune",
    rating: garage?.rating || 4.8,
    travelMinutes: computedEta,
    mechanic: garage?.mechanic || garage?.ownerName || "AutoBuddy Certified Technician",
    vehicle: garage?.vehicle || payload.vehicleInfo || (vehicleType === "bike" ? "AutoBuddy Two-Wheeler Rapid Van" : "AutoBuddy Emergency Service Van"),
    phone: garage?.phone || payload.phone || "+91 1800-889-2889",
    vehicleInfo: payload.vehicleInfo || null,
    status: "pending",
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
    const user = req.user || null;

    const service = String(payload.service || "").trim();
    if (!service) {
      return res.status(400).json({ message: "Service name is required for booking." });
    }

    const vehicleType = payload.vehicleType === "bike" ? "bike" : "car";
    const serviceCompatibility = findServiceCompatibility(service);

    if (serviceCompatibility !== "both" && serviceCompatibility !== vehicleType) {
      return res.status(400).json({
        message: `Service '${service}' is only available for ${serviceCompatibility}s.`
      });
    }

    if (payload.price !== undefined && payload.price !== null) {
      const numPrice = Number(payload.price);
      if (isNaN(numPrice) || numPrice < 0) {
        return res.status(400).json({ message: "Invalid service price provided." });
      }
    }

    const garage = await findRequestedGarage(payload);
    const booking = buildBookingDocument(payload, garage, user);

    await booking.save();

    return res.json({
      message: "Booking successful",
      booking: enrichBooking(booking)
    });
  } catch (error) {
    console.error("Booking creation error:", error);
    return res.status(500).json({ message: "Booking failed: " + error.message });
  }
}

async function listBookings(req, res) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    if (user.role === "admin") {
      const bookings = await Booking.find().sort({ createdAt: -1 });
      return res.json(bookings.map(enrichBooking));
    }

    if (user.role === "garage_owner") {
      return listBookingsByGarage(req, res);
    }

    return listUserBookings(req, res);
  } catch (error) {
    console.error("Fetch bookings error:", error);
    return res.status(500).json({ message: "Failed to fetch bookings: " + error.message });
  }
}

async function resolveOwnerGarageId(user) {
  if (!user) return null;
  if (user.garageId) return user.garageId;

  const rawPhone = user.mobile ? String(user.mobile).trim() : "";
  const withPlus91 = rawPhone.startsWith("+91") ? rawPhone : `+91${rawPhone}`;
  const withoutPlus91 = rawPhone.replace(/^\+91/, "");

  const ownerGarage = await Garage.findOne({
    $or: [
      { ownerId: user.id },
      { phone: withPlus91 },
      { phone: withoutPlus91 },
      { ownerName: user.name }
    ]
  });

  if (ownerGarage) {
    user.garageId = ownerGarage.id;
    await user.save().catch(() => {});
    return ownerGarage.id;
  }

  return null;
}

async function getLatestBooking(req, res) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    let mobile = user.mobile;
    let userId = user.id;

    if (user.role === "admin") {
      if (req.query.mobile) mobile = req.query.mobile;
      if (req.query.userId) userId = req.query.userId;
    }

    const query = {
      $or: [{ "user.mobile": mobile }, { "user.id": userId }]
    };

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

    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Authentication required to view this booking." });
    }

    if (user.role !== "admin") {
      const isBookingCustomer =
        (booking.user?.mobile && booking.user.mobile === user.mobile) ||
        (booking.user?.id && booking.user.id === user.id);

      const ownerGarageId = user.role === "garage_owner" ? await resolveOwnerGarageId(user) : null;
      const isAssignedOwner = Boolean(ownerGarageId && booking.garageId === ownerGarageId);

      if (!isBookingCustomer && !isAssignedOwner) {
        return res.status(403).json({ message: "Access denied. You do not have permission to view this booking." });
      }
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

    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Authentication required to cancel a booking." });
    }

    if (user.role !== "admin") {
      const isBookingCustomer =
        (booking.user?.mobile && booking.user.mobile === user.mobile) ||
        (booking.user?.id && booking.user.id === user.id);

      const ownerGarageId = user.role === "garage_owner" ? await resolveOwnerGarageId(user) : null;
      const isAssignedOwner = Boolean(ownerGarageId && booking.garageId === ownerGarageId);

      if (!isBookingCustomer && !isAssignedOwner) {
        return res.status(403).json({ message: "Access denied. You are not authorized to cancel this booking." });
      }
    }

    const { progress } = getProgress(booking);
    if (progress >= 0.5) {
      return res.status(400).json({ message: "Cannot cancel booking that is already in progress" });
    }

    booking.status = "cancelled";
    booking.ownerNote = req.body?.note || "Cancelled by user";
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

/**
 * Strict Workshop Dispatches Query:
 * Garage Owner receives ONLY bookings for their own verified workshop.
 * Backend enforces filtering at the database query level.
 */
async function listBookingsByGarage(req, res) {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: "Authentication required to view workshop dispatches." });
    }

    let targetGarageId = null;

    if (user.role === "admin") {
      targetGarageId = req.query.garageId || null;
    } else if (user.role === "garage_owner") {
      targetGarageId = await resolveOwnerGarageId(user);

      if (!targetGarageId) {
        return res.status(404).json({ message: "No registered workshop found for this owner account." });
      }

      // If garage owner attempted to query another garageId, reject with 403 Forbidden!
      if (req.query.garageId && req.query.garageId !== targetGarageId) {
        return res.status(403).json({ message: "Access denied. You can only view bookings for your own workshop." });
      }
    } else {
      return res.status(403).json({ message: "Access denied. Only registered garage owners can view workshop dispatches." });
    }

    const query = targetGarageId ? { garageId: targetGarageId } : {};
    const bookings = await Booking.find(query).sort({ createdAt: -1 });
    return res.json(bookings.map(enrichBooking));
  } catch (error) {
    console.error("Fetch garage bookings error:", error);
    return res.status(500).json({ message: "Failed to fetch garage bookings: " + error.message });
  }
}

/**
 * Strict Booking Status Update:
 * Only assigned garage owner or Admin can update progress.
 */
async function updateBookingStatus(req, res) {
  try {
    const booking = await Booking.findOne({ id: req.params.id });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Authentication required to update booking status." });
    }

    if (user.role !== "admin") {
      if (user.role !== "garage_owner") {
        return res.status(403).json({ message: "Access denied. Only garage owners can update service progress." });
      }

      const ownerGarageId = await resolveOwnerGarageId(user);
      if (!ownerGarageId || booking.garageId !== ownerGarageId) {
        return res.status(403).json({ message: "Access denied. You can only update bookings for your own workshop." });
      }
    }

    const { status, ownerNote } = req.body || {};
    const allowedStatuses = ["accepted", "rejected", "in_progress", "completed", "cancelled"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid booking status." });
    }

    if (booking.status === "cancelled" || booking.status === "rejected") {
      return res.status(400).json({ message: "This booking can no longer be updated." });
    }

    booking.status = status;
    if (ownerNote) {
      booking.ownerNote = ownerNote;
    }
    booking.updatedAt = new Date();
    await booking.save();

    return res.json({
      message: `Booking ${status}`,
      booking: enrichBooking(booking)
    });
  } catch (error) {
    console.error("Update booking status error:", error);
    return res.status(500).json({ message: "Failed to update booking: " + error.message });
  }
}

/**
 * Strict Customer Bookings Query:
 * Customer sees ONLY their own bookings.
 */
async function listUserBookings(req, res) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Authentication required to view bookings." });
    }

    let targetMobile = user.mobile;
    let targetUserId = user.id;

    if (user.role === "admin") {
      if (req.query.mobile) targetMobile = req.query.mobile;
      if (req.query.userId) targetUserId = req.query.userId;
    } else {
      if (req.query.mobile && req.query.mobile !== user.mobile) {
        return res.status(403).json({ message: "Access denied. You can only view your own bookings." });
      }
    }

    const query = {
      $or: [{ "user.mobile": targetMobile }, { "user.id": targetUserId }]
    };

    const bookings = await Booking.find(query).sort({ createdAt: -1 });
    return res.json(bookings.map(enrichBooking));
  } catch (error) {
    console.error("Fetch user bookings error:", error);
    return res.status(500).json({ message: "Failed to fetch user bookings: " + error.message });
  }
}

module.exports = {
  cancelBooking,
  createBooking,
  getBookingById,
  getLatestBooking,
  listBookings,
  listBookingsByGarage,
  listUserBookings,
  updateBookingStatus
};
