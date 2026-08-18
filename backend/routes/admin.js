const express = require("express");
const { adminAuthMiddleware } = require("../middleware/adminAuth");
const {
  cancelAdminBooking,
  deleteAdminGarage,
  deleteAdminUser,
  getAdminBookings,
  getAdminGarages,
  getAdminStats,
  getAdminUsers,
  updateAdminBookingStatus
} = require("../controllers/adminController");

const router = express.Router();

// Apply admin authentication middleware to all /api/admin routes
router.use(adminAuthMiddleware);

router.get("/stats", getAdminStats);
router.get("/garages", getAdminGarages);
router.delete("/garages/:id", deleteAdminGarage);
router.get("/bookings", getAdminBookings);
router.post("/bookings/:id/cancel", cancelAdminBooking);
router.put("/bookings/:id/status", updateAdminBookingStatus);
router.get("/users", getAdminUsers);
router.delete("/users/:id", deleteAdminUser);

module.exports = router;
