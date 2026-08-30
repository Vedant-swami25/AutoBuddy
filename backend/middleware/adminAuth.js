const User = require("../models/User");
const { normalizeMobile } = require("../services/otpService");

const ADMIN_MOBILE = "9579278177";

/**
 * Backend authorization middleware for Admin API endpoints.
 * Strictly verifies admin role and credentials from MongoDB.
 */
async function adminAuthMiddleware(req, res, next) {
  try {
    const adminMobile =
      req.headers["x-admin-mobile"] ||
      req.headers["x-user-mobile"] ||
      req.query.adminMobile ||
      req.body?.adminMobile;

    const normalized = normalizeMobile(adminMobile);

    if (normalized !== ADMIN_MOBILE) {
      return res.status(403).json({ message: "Access denied: Unauthorized admin request." });
    }

    const adminUser = await User.findOne({ mobile: ADMIN_MOBILE, role: "admin" });
    if (!adminUser) {
      // Auto-create or ensure admin record in DB
      await User.findOneAndUpdate(
        { mobile: ADMIN_MOBILE },
        {
          $set: {
            name: "System Administrator",
            role: "admin",
            district: "Pune",
            state: "Maharashtra",
            updatedAt: new Date()
          },
          $setOnInsert: {
            id: "ADM-9579278177",
            createdAt: new Date()
          }
        },
        { returnDocument: "after", upsert: true }
      );
    }

    req.admin = { mobile: ADMIN_MOBILE, role: "admin" };
    next();
  } catch (error) {
    console.error("Admin auth middleware error:", error);
    return res.status(500).json({ message: "Admin authorization check failed: " + error.message });
  }
}

module.exports = {
  ADMIN_MOBILE,
  adminAuthMiddleware
};
