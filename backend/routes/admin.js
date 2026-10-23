const express = require("express");
const { authenticate, requireAdmin } = require("../middleware/auth");
const {
  cancelAdminBooking,
  deleteAdminGarage,
  deleteAdminUser,
  getAdminBookings,
  getAdminGarageOwners,
  getAdminGarages,
  getAdminRecentLogins,
  getAdminStats,
  getAdminUsers,
  rejectAdminGarage,
  updateAdminBookingStatus,
  verifyAdminGarage
} = require("../controllers/adminController");

const router = express.Router();

// Apply authentication then admin authorization to all /api/admin routes
router.use(authenticate);
router.use(requireAdmin);

router.get("/stats", getAdminStats);
router.get("/garages", getAdminGarages);
router.put("/garages/:id/verify", verifyAdminGarage);
router.put("/garages/:id/reject", rejectAdminGarage);
router.post("/garages/:id/reject", rejectAdminGarage);
router.delete("/garages/:id", deleteAdminGarage);
router.get("/bookings", getAdminBookings);
router.post("/bookings/:id/cancel", cancelAdminBooking);
router.put("/bookings/:id/status", updateAdminBookingStatus);
router.get("/users", getAdminUsers);
router.get("/owners", getAdminGarageOwners);
router.delete("/users/:id", deleteAdminUser);
router.get("/recent-logins", getAdminRecentLogins);

module.exports = router;
