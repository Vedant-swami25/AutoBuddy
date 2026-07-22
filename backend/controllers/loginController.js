const User = require("../models/User");

/**
 * Login and user lookup handlers.
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
  let user = await User.findOne({ mobile });

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
    id: `USR-${Date.now()}`,
    name,
    email,
    mobile,
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

    return res.json({
      message: "Login successful",
      user: toSessionUser(user)
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
