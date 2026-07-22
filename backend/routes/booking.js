const express = require("express");
const {
  cancelBooking,
  createBooking,
  getBookingById,
  getLatestBooking,
  listBookings
} = require("../controllers/bookingController");

const router = express.Router();

// Booking collection endpoints.
router.post("/", createBooking);
router.get("/", listBookings);
router.get("/latest", getLatestBooking);

// Single-booking endpoints.
router.get("/:id", getBookingById);
router.put("/:id/cancel", cancelBooking);

module.exports = router;
