const Garage = require("../models/Garage");
const Booking = require("../models/Booking");
const User = require("../models/User");
const fallbackGarages = require("../data/garages.json");

/**
 * Get aggregated system statistics for Admin dashboard
 */
async function getAdminStats(_req, res) {
  try {
    const dbGarages = await Garage.find();
    const dbIds = new Set(dbGarages.map((g) => g.id));
    const allGaragesCount = dbGarages.length + fallbackGarages.filter((g) => !dbIds.has(g.id)).length;

    const allBookings = await Booking.find();
    const activeBookingsCount = allBookings.filter((b) => b.status === "pending" || b.status === "accepted" || b.status === "in_progress").length;

    const allUsers = await User.find({ role: { $ne: "admin" } });
    const usersCount = allUsers.filter((u) => u.role === "user").length;
    const ownersCount = allUsers.filter((u) => u.role === "garage_owner").length;

    return res.json({
      garagesCount: allGaragesCount,
      dbGaragesCount: dbGarages.length,
      bookingsCount: allBookings.length,
      activeBookingsCount,
      usersCount,
      ownersCount
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return res.status(500).json({ message: "Failed to fetch stats: " + error.message });
  }
}

/**
 * Get all garages with database flag
 */
async function getAdminGarages(_req, res) {
  try {
    const dbGarages = await Garage.find().sort({ createdAt: -1 });
    const dbIds = new Set(dbGarages.map((g) => g.id));

    const merged = [
      ...dbGarages.map((g) => ({
        ...g.toObject(),
        source: "database",
        canDelete: true
      })),
      ...fallbackGarages.filter((g) => !dbIds.has(g.id)).map((g) => ({
        ...g,
        source: "system",
        canDelete: false
      }))
    ];

    return res.json(merged);
  } catch (error) {
    console.error("Admin garages error:", error);
    return res.status(500).json({ message: "Failed to fetch garages: " + error.message });
  }
}

/**
 * Delete / remove a garage from MongoDB
 */
async function deleteAdminGarage(req, res) {
  try {
    const { id } = req.params;

    const deleted = await Garage.findOneAndDelete({ id });
    if (!deleted) {
      // Check if it's a seed garage
      const isSeed = fallbackGarages.some((g) => g.id === id);
      if (isSeed) {
        return res.status(400).json({ message: "System preset garages cannot be deleted directly from database." });
      }
      return res.status(404).json({ message: "Garage not found." });
    }

    // Clean reference in User document if linked
    await User.updateMany({ garageId: id }, { $set: { garageId: null } });

    return res.json({ message: `Garage "${deleted.name}" (${deleted.id}) removed successfully.`, id });
  } catch (error) {
    console.error("Admin delete garage error:", error);
    return res.status(500).json({ message: "Failed to delete garage: " + error.message });
  }
}

/**
 * Get all bookings across the entire system
 */
async function getAdminBookings(_req, res) {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    return res.json(bookings);
  } catch (error) {
    console.error("Admin bookings error:", error);
    return res.status(500).json({ message: "Failed to fetch bookings: " + error.message });
  }
}

/**
 * Cancel a booking as Administrator
 */
async function cancelAdminBooking(req, res) {
  try {
    const { id } = req.params;
    const booking = await Booking.findOne({ id });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    booking.status = "cancelled";
    booking.ownerNote = "Cancelled by System Administrator";
    booking.updatedAt = new Date();
    await booking.save();

    return res.json({ message: `Booking ${booking.id} cancelled successfully.`, booking });
  } catch (error) {
    console.error("Admin cancel booking error:", error);
    return res.status(500).json({ message: "Failed to cancel booking: " + error.message });
  }
}

/**
 * Update booking status as Administrator
 */
async function updateAdminBookingStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, note } = req.body || {};

    const booking = await Booking.findOne({ id });
    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    if (status) booking.status = status;
    if (note) booking.ownerNote = note;
    booking.updatedAt = new Date();
    await booking.save();

    return res.json({ message: `Booking ${booking.id} updated successfully.`, booking });
  } catch (error) {
    console.error("Admin update booking error:", error);
    return res.status(500).json({ message: "Failed to update booking: " + error.message });
  }
}

/**
 * Get all registered users and garage owners
 */
async function getAdminUsers(_req, res) {
  try {
    const users = await User.find({ role: { $ne: "admin" } }).sort({ createdAt: -1 });
    return res.json(users);
  } catch (error) {
    console.error("Admin users error:", error);
    return res.status(500).json({ message: "Failed to fetch users: " + error.message });
  }
}

/**
 * Delete a user or garage owner
 */
async function deleteAdminUser(req, res) {
  try {
    const { id } = req.params;
    const user = await User.findOne({ id });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.role === "admin") {
      return res.status(403).json({ message: "Cannot delete Administrator account." });
    }

    // If garage owner, also remove their garage
    if (user.garageId) {
      await Garage.findOneAndDelete({ id: user.garageId });
    }

    await User.findOneAndDelete({ id });

    return res.json({ message: `Account for "${user.name}" (${user.mobile}) removed successfully.`, id });
  } catch (error) {
    console.error("Admin delete user error:", error);
    return res.status(500).json({ message: "Failed to delete user: " + error.message });
  }
}

module.exports = {
  cancelAdminBooking,
  deleteAdminGarage,
  deleteAdminUser,
  getAdminBookings,
  getAdminGarages,
  getAdminStats,
  getAdminUsers,
  updateAdminBookingStatus
};
