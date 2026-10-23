const Booking = require("../models/Booking");
const Garage = require("../models/Garage");
const { enrichBooking, getProgress } = require("../services/bookingTracking");
const { calculateDistanceKm, getCoordinatePair } = require("../utils/coordinates");
const { normalizeMobile } = require("../services/otpService");

async function autoAdvanceBookings() {
  const acceptedBookings = await Booking.find({ status: "accepted", acceptedAt: { $ne: null } });
  const now = new Date().getTime();
  for (const b of acceptedBookings) {
    const elapsedMinutes = (now - new Date(b.acceptedAt).getTime()) / 60000;
    const distNum = b.distanceKm ? Number(b.distanceKm) : null;
    const travelMinutes = distNum && !isNaN(distNum) && distNum > 0
      ? Number((distNum * 4).toFixed(1))
      : (b.travelMinutes || 14);

    if (elapsedMinutes >= travelMinutes) {
      b.status = "in_progress";
      await b.save();
    }
  }
}

/**
 * Finds the requested garage or calculates the nearest verified garage using Haversine distance.
 */
async function findRequestedGarage(payload) {
  if (payload.garageId) {
    const garage = await Garage.findOne({ id: payload.garageId });
    if (garage) {
      return { garage, distanceKm: null };
    }
  }

  if (payload.garage) {
    const garage = await Garage.findOne({ name: payload.garage });
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
  const defaultGarage = await Garage.findOne().sort({ rating: -1, verified: -1 });
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

  const rawMobile = user?.mobile || payload.user?.mobile || payload.mobile || "";
  const customerMobile = normalizeMobile(rawMobile) || rawMobile;
  const customerName = user?.name || payload.user?.name || payload.name || "Customer User";
  const customerId = user?.id || payload.user?.id || payload.userId || null;
  const vehicleType = payload.vehicleType === "bike" ? "bike" : "car";

  const destination =
    getCoordinatePair(payload.lat, payload.lng) ||
    getCoordinatePair(payload.location?.lat, payload.location?.lng) ||
    (user?.lat && user?.lng ? { lat: user.lat, lng: user.lng } : null) ||
    { lat: 18.5204, lng: 73.8567 };

  const garageCoordinates =
    getCoordinatePair(garage?.lat, garage?.lng) ||
    getCoordinatePair(payload.garageLat, payload.garageLng) ||
    getCoordinatePair(payload.garageLocation?.lat, payload.garageLocation?.lng) ||
    { lat: destination.lat + 0.024, lng: destination.lng + 0.018 };

  let computedDist = distanceKm;
  if ((computedDist === null || isNaN(computedDist)) && destination && garageCoordinates) {
    const d = calculateDistanceKm(destination.lat, destination.lng, garageCoordinates.lat, garageCoordinates.lng);
    if (d !== null && !isNaN(d)) computedDist = d;
  }
  if (computedDist === null || isNaN(computedDist)) {
    computedDist = 3.5;
  }

  let computedEta = null;
  if (computedDist !== null && !isNaN(computedDist) && computedDist > 0) {
    computedEta = Number((computedDist * 4).toFixed(1));
  } else {
    computedEta = garage?.etaMinutes || 14;
  }

  let bookingPrice = payload.price !== undefined && payload.price !== null ? Number(payload.price) : null;
  if ((bookingPrice === null || isNaN(bookingPrice) || bookingPrice <= 0) && (payload.service === "Book Van" || !payload.service)) {
    bookingPrice = vehicleType === "bike" ? 500 : 1000;
  }

  return new Booking({
    id: payload.id || `BK-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    userId: customerId,
    user: {
      id: customerId,
      name: customerName,
      mobile: customerMobile
    },
    service: payload.service || "Book Van",
    price: bookingPrice,
    vehicleType,
    garageId: garage?.id || payload.garageId || null,
    garage: garage?.name || payload.garage || "AutoBuddy Verified Partner",
    city: garage?.city || payload.city || "Pune",
    rating: garage?.rating || 4.8,
    travelMinutes: computedEta,
    distanceKm: Number(Number(computedDist).toFixed(1)),
    mechanic: garage?.mechanic || garage?.ownerName || "AutoBuddy Certified Technician",
    vehicle: garage?.vehicle || payload.vehicleInfo || (vehicleType === "bike" ? "AutoBuddy Two-Wheeler Rapid Van" : "AutoBuddy Emergency Service Van"),
    phone: garage?.phone || payload.phone || "+91 1800-889-2889",
    vehicleInfo: payload.vehicleInfo || null,
    status: "pending",
    garageLocation: {
      lat: garageCoordinates.lat,
      lng: garageCoordinates.lng
    },
    garageLat: garageCoordinates.lat,
    garageLng: garageCoordinates.lng,
    location: {
      lat: destination.lat,
      lng: destination.lng
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

    // Validate location coordinates if provided
    if (payload.location?.lat !== undefined || payload.location?.lng !== undefined) {
      const userLoc = getCoordinatePair(payload.location?.lat, payload.location?.lng);
      if (!userLoc) {
        return res.status(400).json({ 
          message: "Invalid user location coordinates. Latitude must be -90 to 90, longitude must be -180 to 180." 
        });
      }
    }

    // Strict Requirement: A User can have ONLY ONE active service booking at a time
    const rawMobile = user?.mobile || payload.user?.mobile || payload.mobile || "";
    const customerMobile = normalizeMobile(rawMobile) || rawMobile;
    const customerId = user?.id || payload.user?.id || payload.userId || null;

    const activeStates = ["pending", "accepted", "in_progress"];
    const userConditions = [];
    if (customerMobile) {
      userConditions.push({ "user.mobile": customerMobile });
      userConditions.push({ "user.mobile": rawMobile });
      const bareMobile = customerMobile.replace(/\D/g, "").slice(-10);
      if (bareMobile) {
        userConditions.push({ "user.mobile": bareMobile });
        userConditions.push({ "user.mobile": `+91${bareMobile}` });
      }
    }
    if (customerId) {
      userConditions.push({ userId: customerId });
      userConditions.push({ "user.id": customerId });
    }

    if (userConditions.length > 0) {
      const existingActiveBooking = await Booking.findOne({
        $or: userConditions,
        status: { $in: activeStates }
      });

      if (existingActiveBooking) {
        return res.status(400).json({
          message: "You already have an active booking. Please complete or cancel it before creating a new booking."
        });
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
    await autoAdvanceBookings();

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

  // Strategy 1: Find by owner ID
  let ownerGarage = await Garage.findOne({ ownerId: user.id });
  if (ownerGarage) {
    user.garageId = ownerGarage.id;
    await user.save().catch(() => {});
    return ownerGarage.id;
  }

  // Strategy 2: Find by phone number (normalized)
  const rawPhone = user.mobile ? String(user.mobile).trim() : "";
  const normalized = rawPhone.replace(/\D/g, "");
  const withPlus91 = normalized.length === 10 ? `+91${normalized}` : normalized;
  const withoutPlus91 = normalized.replace(/^\+91/, "");

  ownerGarage = await Garage.findOne({
    $or: [
      { phone: withPlus91 },
      { phone: withoutPlus91 },
      { phone: rawPhone }
    ]
  });
  
  if (ownerGarage) {
    user.garageId = ownerGarage.id;
    await user.save().catch(() => {});
    return ownerGarage.id;
  }

  // Strategy 3: Find by owner name (case-insensitive fuzzy match)
  if (user.name) {
    const nameLower = user.name.toLowerCase();
    ownerGarage = await Garage.findOne({
      ownerName: { $regex: nameLower, $options: "i" }
    });
    
    if (ownerGarage) {
      user.garageId = ownerGarage.id;
      await user.save().catch(() => {});
      return ownerGarage.id;
    }
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
    await autoAdvanceBookings();
    const booking = await Booking.findOne({ id: req.params.id });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Authentication required to view this booking." });
    }

    if (user.role !== "admin") {
      const bookingMobile = normalizeMobile(booking.user?.mobile);
      const userMobile = normalizeMobile(user.mobile);
      const isBookingCustomer =
        (bookingMobile && userMobile && bookingMobile === userMobile) ||
        (booking.user?.id && booking.user.id === user.id) ||
        (booking.userId && booking.userId === user.id);

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
      const bookingMobile = normalizeMobile(booking.user?.mobile);
      const userMobile = normalizeMobile(user.mobile);
      const isBookingCustomer =
        (bookingMobile && userMobile && bookingMobile === userMobile) ||
        (booking.user?.id && booking.user.id === user.id) ||
        (booking.userId && booking.userId === user.id);

      const ownerGarageId = user.role === "garage_owner" ? await resolveOwnerGarageId(user) : null;
      const isAssignedOwner = Boolean(ownerGarageId && booking.garageId === ownerGarageId);

      if (!isBookingCustomer && !isAssignedOwner) {
        return res.status(403).json({ message: "Access denied. You are not authorized to cancel this booking." });
      }
    }

    // Service in progress MUST NOT be cancelled
    if (booking.status === "in_progress") {
      return res.status(400).json({ message: "Service is already in progress and cannot be cancelled." });
    }
    if (booking.status === "completed") {
      return res.status(400).json({ message: "Completed service cannot be cancelled." });
    }
    if (booking.status === "cancelled") {
      return res.status(400).json({ message: "Booking is already cancelled." });
    }

    // Cancellation permitted for pending, confirmed, and accepted ("Service Partner Assigned")
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

    // Validate state transitions
    const validTransitions = {
      "pending": ["accepted", "rejected", "cancelled"],
      "accepted": ["in_progress", "rejected", "cancelled"],
      "in_progress": ["completed", "cancelled"],
      "completed": [],
      "rejected": [],
      "cancelled": []
    };

    const currentStatus = booking.status || "pending";
    if (!validTransitions[currentStatus].includes(status)) {
      return res.status(400).json({ 
        message: `Cannot transition from '${currentStatus}' to '${status}'. This booking can no longer be updated.` 
      });
    }

    booking.status = status;
    if (status === "accepted") {
      booking.acceptedAt = new Date();
    }
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

    let targetMobile = normalizeMobile(user.mobile) || user.mobile;
    let targetUserId = user.id;

    if (user.role === "admin") {
      if (req.query.mobile) targetMobile = normalizeMobile(req.query.mobile) || req.query.mobile;
      if (req.query.userId) targetUserId = req.query.userId;
    } else {
      if (req.query.mobile) {
        const queryNorm = normalizeMobile(req.query.mobile) || req.query.mobile;
        if (queryNorm !== targetMobile) {
          return res.status(403).json({ message: "Access denied. You can only view your own bookings." });
        }
      }
    }

    const orClauses = [
      { "user.mobile": targetMobile },
      { "user.mobile": `+91${targetMobile}` },
      { "user.mobile": `+91 ${targetMobile}` }
    ];

    if (targetUserId) {
      orClauses.push({ "user.id": targetUserId });
      orClauses.push({ userId: targetUserId });
    }

    const bookings = await Booking.find({ $or: orClauses }).sort({ createdAt: -1 });
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
