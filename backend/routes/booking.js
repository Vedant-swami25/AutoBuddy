const express = require("express");
const { authenticate, requireAuth } = require("../middleware/auth");
const {
  cancelBooking,
  createBooking,
  getBookingById,
  getLatestBooking,
  listBookings,
  listBookingsByGarage,
  listUserBookings,
  updateBookingStatus
} = require("../controllers/bookingController");

const router = express.Router();

// Apply authentication middleware to extract and verify caller identity
router.use(authenticate);

// POST/PUT/DELETE operations require authentication
router.post("/", requireAuth, createBooking);
router.get("/", listBookings); // Allow unauthenticated GET for public bookings
router.get("/user", requireAuth, listUserBookings);
router.get("/garage", requireAuth, listBookingsByGarage);
router.get("/latest", requireAuth, getLatestBooking);
router.get("/:id", requireAuth, getBookingById);
router.put("/:id/status", requireAuth, updateBookingStatus);
router.patch("/:id/status", requireAuth, updateBookingStatus);
router.post("/:id/status", requireAuth, updateBookingStatus);
router.put("/:id/cancel", requireAuth, cancelBooking);
router.post("/:id/cancel", requireAuth, cancelBooking);

module.exports = router;
