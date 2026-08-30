const express = require("express");
const { authenticate } = require("../middleware/auth");
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

router.post("/", createBooking);
router.get("/", listBookings);
router.get("/user", listUserBookings);
router.get("/garage", listBookingsByGarage);
router.get("/latest", getLatestBooking);
router.get("/:id", getBookingById);
router.put("/:id/status", updateBookingStatus);
router.patch("/:id/status", updateBookingStatus);
router.post("/:id/status", updateBookingStatus);
router.put("/:id/cancel", cancelBooking);
router.post("/:id/cancel", cancelBooking);

module.exports = router;
