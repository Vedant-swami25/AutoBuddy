const Garage = require("../models/Garage");
const Booking = require("../models/Booking");
const User = require("../models/User");
const LoginHistory = require("../models/LoginHistory");
const fallbackGarages = require("../data/garages.json");
const { enrichBooking } = require("../services/bookingTracking");

/**
 * Get aggregated system statistics for Admin dashboard
 */
async function getAdminStats(_req, res) {
  try {
    const dbGarages = await Garage.find();
    const dbIds = new Set(dbGarages.map((g) => g.id));
    const allGarages = [
      ...dbGarages.map((g) => (g.toObject ? g.toObject() : g)),
      ...fallbackGarages.filter((g) => !dbIds.has(g.id))
    ];

    const verifiedGaragesCount = allGarages.filter((g) => Boolean(g.verified)).length;
    const unverifiedGaragesCount = allGarages.filter((g) => !g.verified).length;

    const allBookings = await Booking.find();
    const activeBookingsCount = allBookings.filter((b) => b.status === "pending" || b.status === "accepted" || b.status === "in_progress").length;

    const allUsers = await User.find({ role: { $ne: "admin" } });
    const usersCount = allUsers.filter((u) => u.role === "user").length;
    const ownersCount = allUsers.filter((u) => u.role === "garage_owner").length;

    return res.json({
      garagesCount: allGarages.length,
      verifiedGaragesCount,
      unverifiedGaragesCount,
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
async function getAdminGarages(req, res) {
  try {
    const dbGarages = await Garage.find().sort({ createdAt: -1 });
    const dbIds = new Set(dbGarages.map((g) => g.id));

    let merged = [
      ...dbGarages.map((g) => ({
        ...(g.toObject ? g.toObject() : g),
        source: "database",
        canDelete: true
      })),
      ...fallbackGarages.filter((g) => !dbIds.has(g.id)).map((g) => ({
        ...g,
        source: "system",
        canDelete: false
      }))
    ];

    const statusFilter = req.query?.status;
    if (statusFilter === "verified") {
      merged = merged.filter((g) => Boolean(g.verified));
    } else if (statusFilter === "pending" || statusFilter === "unverified") {
      merged = merged.filter((g) => !g.verified);
    }

    return res.json(merged);
  } catch (error) {
    console.error("Admin garages error:", error);
    return res.status(500).json({ message: "Failed to fetch garages: " + error.message });
  }
}

/**
 * Verify a garage as Administrator
 */
async function verifyAdminGarage(req, res) {
  try {
    const { id } = req.params;
    let garage = await Garage.findOne({ id });
    if (!garage) {
      garage = await Garage.findOne({ ownerId: id });
    }

    if (!garage) {
      const seed = fallbackGarages.find((g) => g.id === id);
      if (seed) {
        garage = new Garage({ ...seed, verified: true });
        await garage.save();
      } else {
        return res.status(404).json({ message: "Garage not found." });
      }
    } else {
      garage.verified = true;
      garage.updatedAt = new Date();
      await garage.save();
    }

    return res.json({
      message: `Garage "${garage.name}" (${garage.id}) is now verified.`,
      garage
    });
  } catch (error) {
    console.error("Verify garage error:", error);
    return res.status(500).json({ message: "Failed to verify garage: " + error.message });
  }
}

/**
 * Delete / reject / remove a garage from MongoDB
 * Permanently removes garage record while safely preserving owner and user accounts.
 */
async function deleteAdminGarage(req, res) {
  try {
    const { id } = req.params;

    let deleted = await Garage.findOneAndDelete({ id });
    if (!deleted) {
      deleted = await Garage.findOneAndDelete({ ownerId: id });
    }

    if (!deleted) {
      const ownerUser = await User.findOne({ id, role: "garage_owner" });
      if (ownerUser && ownerUser.garageId) {
        deleted = await Garage.findOneAndDelete({ id: ownerUser.garageId });
      }
    }

    if (!deleted) {
      // Check if it's a seed garage
      const isSeed = fallbackGarages.some((g) => g.id === id);
      if (isSeed) {
        return res.status(400).json({ message: "System preset garages cannot be deleted directly from database." });
      }
      return res.status(404).json({ message: "Garage not found." });
    }

    // Clean reference in User document if linked
    await User.updateMany({ $or: [{ garageId: deleted.id }, { garageId: id }] }, { $set: { garageId: null } });

    return res.json({ message: `Garage "${deleted.name}" (${deleted.id}) removed successfully.`, id: deleted.id });
  } catch (error) {
    console.error("Admin delete garage error:", error);
    return res.status(500).json({ message: "Failed to delete garage: " + error.message });
  }
}

/**
 * Reject a pending/unverified garage registration from MongoDB
 * Ensures the garage is permanently removed and cannot appear as verified or in active listings.
 * Also removes the garage_owner registration so it is no longer available for sign-in.
 */
async function rejectAdminGarage(req, res) {
  try {
    const { id } = req.params;

    let garage = await Garage.findOne({ id });
    if (!garage) {
      garage = await Garage.findOne({ ownerId: id });
    }
    if (!garage) {
      const ownerUser = await User.findOne({ id, role: "garage_owner" });
      if (ownerUser && ownerUser.garageId) {
        garage = await Garage.findOne({ id: ownerUser.garageId });
      }
    }

    const garageId = garage ? garage.id : id;
    const ownerId = garage?.ownerId || id;

    // Delete garage document from MongoDB
    if (garage) {
      await Garage.deleteMany({ $or: [{ id: garageId }, { ownerId: ownerId }] });
    }

    // Remove the garage_owner role / user registration so sign-in is no longer available
    await User.deleteMany({
      $or: [
        { id: ownerId, role: "garage_owner" },
        { garageId: garageId, role: "garage_owner" },
        { id: garageId, role: "garage_owner" }
      ]
    });

    return res.json({
      message: `Garage "${garage?.name || id}" rejected and permanently removed from MongoDB.`,
      id: garageId
    });
  } catch (error) {
    console.error("Admin reject garage error:", error);
    return res.status(500).json({ message: "Failed to reject garage: " + error.message });
  }
}

/**
 * Get all bookings across the entire system with real enriched statuses and pricing
 */
async function getAdminBookings(_req, res) {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    return res.json(bookings.map(enrichBooking));
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
 * Get all registered users from MongoDB (Customer Users and Garage Owners)
 */
async function getAdminUsers(req, res) {
  try {
    const roleFilter = req.query?.role;
    const query = roleFilter && roleFilter !== "all"
      ? { role: roleFilter }
      : { role: { $ne: "admin" } };

    const rawUsers = await User.find(query).sort({ createdAt: -1 });

    const formatted = rawUsers.map((u) => ({
      id: u.id,
      name: u.name || (u.role === "garage_owner" ? "Garage Owner" : "Customer User"),
      email: u.email || "",
      mobile: u.mobile || "",
      role: u.role || "user",
      garageId: u.garageId || null,
      district: u.district || "Pune",
      state: u.state || "Maharashtra",
      vehicleType: u.vehicleType || "all",
      createdAt: u.createdAt || new Date()
    }));

    return res.json(formatted);
  } catch (error) {
    console.error("Admin users error:", error);
    return res.status(500).json({ message: "Failed to fetch users: " + error.message });
  }
}

/**
 * Get all registered garage owners (role: 'garage_owner') with their linked workshop details
 */
async function getAdminGarageOwners(_req, res) {
  try {
    const rawOwners = await User.find({ role: "garage_owner" }).sort({ createdAt: -1 });
    const garages = await Garage.find();
    const garageMap = new Map();
    garages.forEach((g) => {
      garageMap.set(g.id, g);
      if (g.ownerId) garageMap.set(g.ownerId, g);
      if (g.phone) {
        const p = String(g.phone).replace(/\D/g, "").slice(-10);
        if (p) garageMap.set(p, g);
      }
    });

    const enriched = [];
    const seenGarageIds = new Set();
    const seenOwnerMobiles = new Set();

    for (const owner of rawOwners) {
      const p = String(owner.mobile || "").replace(/\D/g, "").slice(-10);
      const linkedGarage =
        (owner.garageId && garageMap.get(owner.garageId)) ||
        garageMap.get(owner.id) ||
        (p ? garageMap.get(p) : null) ||
        null;

      const isVerified = linkedGarage ? Boolean(linkedGarage.verified) : false;
      const garageId = linkedGarage ? linkedGarage.id : (owner.garageId || null);

      if (garageId) seenGarageIds.add(garageId);
      if (p) seenOwnerMobiles.add(p);

      enriched.push({
        id: owner.id,
        name: owner.name || "Workshop Owner",
        email: owner.email || "",
        mobile: owner.mobile || "",
        role: "garage_owner",
        district: owner.district || (linkedGarage?.city) || "Pune",
        state: owner.state || "Maharashtra",
        garageId: garageId,
        garageName: linkedGarage ? linkedGarage.name : "Workshop Pending Setup",
        garageAddress: linkedGarage ? (linkedGarage.address || linkedGarage.city) : (owner.district || "Pune"),
        garagePhone: linkedGarage ? linkedGarage.phone : `+91${owner.mobile}`,
        verified: isVerified,
        status: isVerified ? "verified" : "pending",
        rating: linkedGarage?.rating || 4.8,
        createdAt: owner.createdAt || new Date()
      });
    }

    // Also include any garages in MongoDB that don't have an explicit User record yet
    for (const g of garages) {
      if (seenGarageIds.has(g.id)) continue;
      const p = String(g.phone || "").replace(/\D/g, "").slice(-10);
      if (p && seenOwnerMobiles.has(p)) continue;

      // Ensure a User record exists for this garage owner so Sign In as Owner works
      const ownerMobile = p || "9800000000";
      let ownerUser = await User.findOne({
        $or: [
          { garageId: g.id, role: "garage_owner" },
          { id: g.ownerId, role: "garage_owner" },
          { mobile: ownerMobile, role: "garage_owner" }
        ]
      });

      if (!ownerUser && (g.ownerName || g.name)) {
        ownerUser = await User.findOneAndUpdate(
          { mobile: ownerMobile, role: "garage_owner" },
          {
            $set: {
              name: g.ownerName || g.mechanic || "Workshop Partner",
              role: "garage_owner",
              garageId: g.id,
              district: g.city || "Pune",
              state: "Maharashtra",
              updatedAt: new Date()
            },
            $setOnInsert: {
              id: g.ownerId || `OWN-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              createdAt: new Date()
            }
          },
          { returnDocument: "after", upsert: true }
        );
      }

      if (g.id) seenGarageIds.add(g.id);
      if (p) seenOwnerMobiles.add(p);

      const isVerified = Boolean(g.verified);
      enriched.push({
        id: ownerUser ? ownerUser.id : (g.ownerId || g.id),
        name: g.ownerName || g.mechanic || "Workshop Partner",
        email: ownerUser?.email || "",
        mobile: ownerUser?.mobile || p || "",
        role: "garage_owner",
        district: g.city || "Pune",
        state: "Maharashtra",
        garageId: g.id,
        garageName: g.name,
        garageAddress: g.address || g.city,
        garagePhone: g.phone,
        verified: isVerified,
        status: isVerified ? "verified" : "pending",
        rating: g.rating || 4.8,
        createdAt: g.createdAt || new Date()
      });
    }

    return res.json(enriched);
  } catch (error) {
    console.error("Admin garage owners error:", error);
    return res.status(500).json({ message: "Failed to fetch garage owners: " + error.message });
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

/**
 * Get latest 50 successful login audit records
 */
async function getAdminRecentLogins(_req, res) {
  try {
    const rawLogins = await LoginHistory.find().sort({ timestamp: -1 }).limit(50);

    const formatted = rawLogins.map((item) => {
      let roleLabel = "User";
      if (item.role === "admin") {
        roleLabel = "Administrator";
      } else if (item.role === "garage_owner" || item.role === "owner") {
        roleLabel = "Garage Owner";
      } else if (item.role === "user") {
        roleLabel = "User";
      }

      return {
        id: item.id,
        userId: item.userId || null,
        name: item.name || "Authenticated User",
        email: item.email || "",
        mobile: item.mobile || "",
        role: item.role,
        roleLabel,
        garageId: item.garageId || null,
        garageName: item.garageName || null,
        timestamp: item.timestamp,
        ip: item.ip || ""
      };
    });

    return res.json(formatted);
  } catch (error) {
    console.error("Admin recent logins error:", error);
    return res.status(500).json({ message: "Failed to fetch recent logins: " + error.message });
  }
}

module.exports = {
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
};
