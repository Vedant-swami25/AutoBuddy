const User = require("../models/User");
const LoginHistory = require("../models/LoginHistory");

/**
 * Login and user lookup handlers.
 * Legacy endpoint — new clients should use /api/auth/otp/* routes.
 */
function toStoredCoordinate(value) {
  return typeof value === "number" ? value : null;
}

function toSessionUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    mobile: user.mobile,
    district: user.district,
    state: user.state,
    role: user.role || "user",
    garageId: user.garageId || null,
    lat: user.lat,
    lng: user.lng,
    createdAt: user.createdAt
  };
}

async function findEmailConflict(email, mobile) {
  return User.findOne({ email, mobile: { $ne: mobile } });
}

async function upsertUser(payload) {
  const { name, email, mobile, district, state, lat, lng } = payload;
  const role = payload.role === "garage_owner" ? "garage_owner" : "user";
  let user = await User.findOne({ mobile, role });

  if (user) {
    user.name = name;
    user.email = email;
    user.district = district;
    user.state = state;
    user.lat = toStoredCoordinate(lat);
    user.lng = toStoredCoordinate(lng);
    user.updatedAt = new Date();
    return user;
  }

  return new User({
    id: `${role === "garage_owner" ? "OWN" : "USR"}-${Date.now()}`,
    name,
    email,
    mobile,
    role,
    district,
    state,
    lat: toStoredCoordinate(lat),
    lng: toStoredCoordinate(lng)
  });
}

async function login(req, res) {
  try {
    const payload = req.body || {};
    const { name, email, mobile, district, state } = payload;

    if (!name || !email || !mobile || !district || !state) {
      return res.status(400).json({ message: "All login fields are required" });
    }

    const conflictingUser = await findEmailConflict(email, mobile);
    if (conflictingUser) {
      return res.status(409).json({ message: "This email is already registered with another mobile number." });
    }

    const user = await upsertUser(payload);
    await user.save();

    const sessionUser = toSessionUser(user);

    try {
      const ip = req?.headers?.["x-forwarded-for"] || req?.socket?.remoteAddress || "";
      await LoginHistory.create({
        id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        userId: sessionUser.id || null,
        name: sessionUser.name || "Authenticated User",
        email: sessionUser.email || "",
        mobile: sessionUser.mobile || "",
        role: sessionUser.role || "user",
        garageId: sessionUser.garageId || null,
        ip: String(ip).substring(0, 45),
        timestamp: new Date()
      });
    } catch (logErr) {
      console.error("Failed to record login history:", logErr);
    }

    return res.json({
      message: "Login successful",
      user: sessionUser
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Login failed: " + error.message });
  }
}

async function listUsers(_req, res) {
  try {
    const users = await User.find();
    return res.json(users);
  } catch (error) {
    console.error("Fetch users error:", error);
    return res.status(500).json({ message: "Failed to fetch users: " + error.message });
  }
}

module.exports = {
  listUsers,
  login
};
