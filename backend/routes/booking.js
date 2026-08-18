const express = require("express");
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

router.post("/", createBooking);
router.get("/", listBookings);
router.get("/user", listUserBookings);
router.get("/garage", listBookingsByGarage);
router.get("/latest", getLatestBooking);
router.get("/:id", getBookingById);
router.put("/:id/status", updateBookingStatus);
router.patch("/:id/status", updateBookingStatus);
router.put("/:id/cancel", cancelBooking);

module.exports = router;
