const User = require("../models/User");
const { normalizeMobile } = require("../services/otpService");

const ADMIN_MOBILE = "9579278177";

/**
 * Extracts and resolves the user identity from request headers or query/body.
 * Attaches req.user if a valid registered account matches.
 */
async function authenticate(req, _res, next) {
  try {
    const rawMobile =
      req.headers["x-user-mobile"] ||
      req.headers["x-admin-mobile"] ||
      (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")
        ? req.headers.authorization.slice(7)
        : null) ||
      req.query?.mobile ||
      req.query?.adminMobile ||
      req.body?.mobile ||
      req.body?.adminMobile;

    const normalized = normalizeMobile(rawMobile);

    if (!normalized || normalized.length !== 10) {
      req.user = null;
      req.isAuthenticated = false;
      return next();
    }

    // Special Administrator Account
    if (normalized === ADMIN_MOBILE) {
      let adminUser = await User.findOne({ mobile: ADMIN_MOBILE, role: "admin" });
      if (!adminUser) {
        adminUser = await User.findOneAndUpdate(
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
      req.user = adminUser;
      req.isAuthenticated = true;
      return next();
    }

    const user = await User.findOne({ mobile: normalized });
    if (user) {
      req.user = user;
      req.isAuthenticated = true;
    } else {
      req.user = null;
      req.isAuthenticated = false;
    }

    return next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    req.user = null;
    req.isAuthenticated = false;
    return next();
  }
}

/**
 * Middleware: Strictly requires that the user is authenticated.
 */
function requireAuth(req, res, next) {
  if (!req.user || !req.isAuthenticated) {
    return res.status(401).json({ message: "Authentication required. Please sign in with your mobile number." });
  }
  return next();
}

/**
 * Middleware: Strictly requires specific role(s) (e.g. "admin", "garage_owner").
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.isAuthenticated) {
      return res.status(401).json({ message: "Authentication required. Please sign in." });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: `Access denied. Requires ${allowedRoles.join(" or ")} role.` });
    }

    return next();
  };
}

/**
 * Middleware: Strictly requires Administrator role.
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin" || req.user.mobile !== ADMIN_MOBILE) {
    return res.status(403).json({ message: "Access denied: Unauthorized administrator request." });
  }
  return next();
}

module.exports = {
  ADMIN_MOBILE,
  authenticate,
  requireAdmin,
  requireAuth,
  requireRole
};
