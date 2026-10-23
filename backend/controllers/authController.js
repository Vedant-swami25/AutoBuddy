const User = require("../models/User");
const Garage = require("../models/Garage");
const LoginHistory = require("../models/LoginHistory");
const {
  clearOtp,
  isDemoMode,
  isOtpVerified,
  normalizeMobile,
  storeOtp,
  verifyOtp
} = require("../services/otpService");

const ADMIN_MOBILE = "9579278177";

async function recordSuccessfulLogin(userData, req, actualRole = null) {
  try {
    const ip = req?.headers?.["x-forwarded-for"] || req?.socket?.remoteAddress || "";
    const loginRole = actualRole || userData.role || "user";
    await LoginHistory.create({
      id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: userData.id || null,
      name: userData.name || "Authenticated User",
      email: userData.email || "",
      mobile: userData.mobile || "",
      role: loginRole,
      garageId: loginRole === "garage_owner" ? (userData.garageId || null) : null,
      garageName: loginRole === "garage_owner" ? (userData.garageName || null) : null,
      ip: String(ip).substring(0, 45),
      timestamp: new Date()
    });
  } catch (err) {
    console.error("Failed to record login history:", err);
  }
}

function escapeRegex(text) {
  return String(text || "").replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

function toStoredCoordinate(value) {
  return typeof value === "number" && !isNaN(value) && value !== 0 ? value : null;
}

function toSessionUser(user, activeRole = null) {
  const role = activeRole || user.role || "user";
  return {
    id: user.id,
    name: user.name,
    email: user.email || "",
    mobile: user.mobile,
    district: user.district || "Pune",
    state: user.state || "Maharashtra",
    role: role,
    garageId: role === "garage_owner" ? (user.garageId || null) : null,
    garageName: role === "garage_owner" ? (user.garageName || null) : null,
    lat: user.lat,
    lng: user.lng,
    createdAt: user.createdAt
  };
}

function validateRole(role) {
  if (role === "admin") return "admin";
  if (role === "garage_owner" || role === "owner") return "garage_owner";
  return "user";
}

/**
 * Sign In OTP Request — Supports Admin (9579278177 without name) and User/Garage Owner (Name + Mobile)
 */
async function signinOtpHandler(req, res) {
  try {
    const { name, mobile, role, testTtlMs } = req.body || {};
    const normalizedMobile = normalizeMobile(mobile);
    const normalizedName = String(name || "").trim();
    const selectedRole = validateRole(role);

    if (!/^\d{10}$/.test(normalizedMobile)) {
      return res.status(400).json({ message: "Please enter a valid 10-digit mobile number." });
    }

    // Special Secure Admin Handling
    if (normalizedMobile === ADMIN_MOBILE) {
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

      const customTtl = typeof testTtlMs === "number" ? testTtlMs : null;
      const { otp, expiresAt, expiresIn } = storeOtp(ADMIN_MOBILE, "admin", customTtl);

      const response = {
        exists: true,
        isAdmin: true,
        message: "Admin verification code sent successfully.",
        expiresIn,
        user: {
          name: "System Administrator",
          mobile: ADMIN_MOBILE,
          role: "admin"
        }
      };

      if (isDemoMode()) {
        response.demoMode = true;
        response.demoOtp = otp;
        response.demoNote = "Development mode: use the OTP shown here. Connect an SMS provider for production.";
      }

      return res.json(response);
    }

    // Standard User / Garage Owner requires Name
    if (!normalizedName) {
      return res.status(400).json({ message: "Name is required for Sign In." });
    }

    if (selectedRole === "garage_owner") {
      // Check if this mobile has an existing Garage Owner account
      let user = await User.findOne({ mobile: normalizedMobile, role: "garage_owner" });
      if (!user) {
        user = await User.findOne({ mobile: normalizedMobile, garageId: { $ne: null } });
      }

      // Also check if a registered garage exists for this mobile number
      const matchingGarage = await Garage.findOne({
        $or: [
          { phone: `+91${normalizedMobile}` },
          { phone: normalizedMobile },
          { phone: `+91 ${normalizedMobile}` }
        ]
      });

      if (!user && matchingGarage) {
        user = await User.findOne({ mobile: normalizedMobile });
        if (user) {
          user.role = "garage_owner";
          user.garageId = matchingGarage.id;
          await user.save();
        }
      }

      // If no registered garage owner account exists in MongoDB, do NOT allow sign in
      if (!user && !matchingGarage) {
        return res.status(404).json({
          exists: false,
          role: "garage_owner",
          redirect: "login.html?role=owner&mode=signup",
          message: "No registered Garage Owner account found for this mobile number. Please register your garage first."
        });
      }

      const customTtl = typeof testTtlMs === "number" ? testTtlMs : null;
      const { otp, expiresIn } = storeOtp(normalizedMobile, "garage_owner", customTtl);

      const response = {
        exists: true,
        message: "Verification code sent successfully.",
        expiresIn,
        user: {
          id: user ? user.id : (matchingGarage ? matchingGarage.id : null),
          name: user ? user.name : (matchingGarage ? (matchingGarage.ownerName || matchingGarage.name) : normalizedName),
          mobile: normalizedMobile,
          role: "garage_owner"
        }
      };

      if (isDemoMode()) {
        response.demoMode = true;
        response.demoOtp = otp;
        response.demoNote = "Development mode: use the OTP shown here. Connect an SMS provider for production.";
      }

      return res.json(response);
    }

    // Standard User: Look up existing user account by mobile and role === "user"
    const user = await User.findOne({ mobile: normalizedMobile, role: "user" });

    // Only existing registered accounts should be able to Sign In
    if (!user) {
      return res.status(404).json({
        exists: false,
        role: "user",
        redirect: "login.html?role=user&mode=signup",
        message: "No registered User account found for this mobile number. Please create an account first."
      });
    }

    const customTtl = typeof testTtlMs === "number" ? testTtlMs : null;
    const { otp, expiresIn } = storeOtp(normalizedMobile, "user", customTtl);

    const response = {
      exists: true,
      message: "Verification code sent successfully.",
      expiresIn,
      user: {
        id: user.id,
        name: user.name,
        mobile: user.mobile,
        role: "user"
      }
    };

    if (isDemoMode()) {
      response.demoMode = true;
      response.demoOtp = otp;
      response.demoNote = "Development mode: use the OTP shown here. Connect an SMS provider for production.";
    }

    return res.json(response);
  } catch (error) {
    console.error("Sign in OTP error:", error);
    return res.status(500).json({ message: "Could not send verification code: " + error.message });
  }
}

/**
 * Sign In OTP Verification — Logs in Admin or User/Garage Owner
 */
async function verifySigninHandler(req, res) {
  try {
    const { name, mobile, otp, role } = req.body || {};
    const normalizedMobile = normalizeMobile(mobile);
    const normalizedName = String(name || "").trim();
    const selectedRole = validateRole(role);

    if (!/^\d{10}$/.test(normalizedMobile)) {
      return res.status(400).json({ message: "Please enter a valid 10-digit mobile number." });
    }

    if (!otp) {
      return res.status(400).json({ message: "Verification code is required." });
    }

    // Special Secure Admin Verification
    if (normalizedMobile === ADMIN_MOBILE) {
      const result = verifyOtp(ADMIN_MOBILE, otp);
      if (!result.ok) {
        return res.status(401).json({ message: result.message });
      }

      clearOtp(ADMIN_MOBILE);

      const adminSession = {
        id: "ADM-9579278177",
        name: "System Administrator",
        email: "admin@autobuddy.in",
        mobile: ADMIN_MOBILE,
        district: "Pune",
        state: "Maharashtra",
        role: "admin",
        garageId: null,
        garageName: null,
        createdAt: new Date()
      };

      await recordSuccessfulLogin(adminSession, req, "admin");

      return res.json({
        message: "Admin login successful",
        user: adminSession
      });
    }

    let user = null;
    if (selectedRole === "garage_owner") {
      user = await User.findOne({ mobile: normalizedMobile, role: "garage_owner" });
      if (!user) {
        user = await User.findOne({ mobile: normalizedMobile, garageId: { $ne: null } });
      }
      if (!user) {
        const matchingGarage = await Garage.findOne({
          $or: [
            { phone: `+91${normalizedMobile}` },
            { phone: normalizedMobile },
            { phone: `+91 ${normalizedMobile}` }
          ]
        });
        if (matchingGarage) {
          user = await User.findOne({ mobile: normalizedMobile });
          if (user) {
            user.role = "garage_owner";
            user.garageId = matchingGarage.id;
            await user.save();
          }
        }
      }
      if (!user) {
        return res.status(404).json({
          exists: false,
          role: "garage_owner",
          redirect: "login.html?role=owner&mode=signup",
          message: "No registered Garage Owner account found. Please register your garage first."
        });
      }
    } else {
      user = await User.findOne({ mobile: normalizedMobile, role: "user" });
      if (!user) {
        return res.status(404).json({
          exists: false,
          role: "user",
          redirect: "login.html?role=user&mode=signup",
          message: "No registered account found. Please create an account first."
        });
      }
    }

    if (normalizedName && (!user.name || user.name === "User" || user.name === "Garage Owner")) {
      user.name = normalizedName;
      await user.save();
    }

    const result = verifyOtp(normalizedMobile, otp);
    if (!result.ok) {
      return res.status(401).json({ message: result.message });
    }

    clearOtp(normalizedMobile);

    let garageName = null;
    if (selectedRole === "garage_owner") {
      let garage = user.garageId ? await Garage.findOne({ id: user.garageId }) : null;
      if (!garage) {
        garage = await Garage.findOne({
          $or: [
            { ownerId: user.id },
            { phone: `+91${normalizedMobile}` },
            { phone: normalizedMobile }
          ]
        });
        if (garage) {
          user.garageId = garage.id;
          if (!garage.ownerId) garage.ownerId = user.id;
          if (!garage.ownerName) garage.ownerName = user.name;
          await user.save();
          await garage.save();
        }
      }
      if (garage) {
        garageName = garage.name;
      }
    }

    const sessionObj = toSessionUser(user, selectedRole);
    if (garageName) sessionObj.garageName = garageName;

    await recordSuccessfulLogin(sessionObj, req, selectedRole);

    return res.json({
      message: "Login successful",
      user: sessionObj
    });
  } catch (error) {
    console.error("Verify signin error:", error);
    return res.status(500).json({ message: "Verification failed: " + error.message });
  }
}

/**
 * Sign Up OTP Request
 */
async function signupOtpHandler(req, res) {
  try {
    const { name, mobile, role, garageName, testTtlMs } = req.body || {};
    const normalizedMobile = normalizeMobile(mobile);
    const selectedRole = validateRole(role);

    if (!/^\d{10}$/.test(normalizedMobile)) {
      return res.status(400).json({ message: "Please enter a valid 10-digit mobile number." });
    }

    if (normalizedMobile === ADMIN_MOBILE) {
      return res.status(403).json({
        exists: true,
        message: "Admin mobile 9579278177 is reserved. Please use Sign In."
      });
    }

    // Check existing User
    const existing = await User.findOne({ mobile: normalizedMobile, role: selectedRole });
    if (existing) {
      const roleLabel = selectedRole === "garage_owner" ? "Garage Owner" : "User";
      return res.status(409).json({
        exists: true,
        message: `An account already exists for +91 ${normalizedMobile} as a ${roleLabel}. Please Sign In instead.`
      });
    }

    const customTtl = typeof testTtlMs === "number" ? testTtlMs : null;
    const { otp, expiresAt, expiresIn } = storeOtp(normalizedMobile, selectedRole, customTtl);

    const response = {
      exists: false,
      message: "Verification code sent for registration.",
      expiresIn
    };

    if (isDemoMode()) {
      response.demoMode = true;
      response.demoOtp = otp;
      response.demoNote = "Development mode: use the OTP shown here. Connect an SMS provider for production.";
    }

    return res.json(response);
  } catch (error) {
    console.error("Signup OTP error:", error);
    return res.status(500).json({ message: "Could not send OTP: " + error.message });
  }
}

/**
 * Sign Up Completion
 */
async function signupHandler(req, res) {
  try {
    const payload = req.body || {};
    const normalizedMobile = normalizeMobile(payload.mobile);
    const selectedRole = validateRole(payload.role);
    const { name, email, district, state, garageName, address, otp, lat, lng } = payload;

    if (!/^\d{10}$/.test(normalizedMobile)) {
      return res.status(400).json({ message: "Please enter a valid 10-digit mobile number." });
    }

    if (normalizedMobile === ADMIN_MOBILE) {
      return res.status(403).json({
        message: "Admin mobile 9579278177 cannot be registered as a normal user. Please use Sign In."
      });
    }

    if (!name) {
      return res.status(400).json({ message: "Name is required." });
    }

    // Verify OTP
    if (otp) {
      const otpResult = verifyOtp(normalizedMobile, otp);
      if (!otpResult.ok) {
        return res.status(401).json({ message: otpResult.message });
      }
    } else if (!isOtpVerified(normalizedMobile)) {
      return res.status(401).json({ message: "Please verify your mobile number with OTP first." });
    }

    let linkedGarageId = null;
    let finalGarageName = garageName ? String(garageName).trim() : `${name.trim()}'s Auto Care`;

    // If garage owner, check for existing garage in MongoDB by phone or name
    if (selectedRole === "garage_owner") {
      const garagePhone = `+91${normalizedMobile}`;
      const existingGarage = await Garage.findOne({
        $or: [
          { phone: garagePhone },
          { phone: normalizedMobile },
          { name: new RegExp("^" + escapeRegex(finalGarageName) + "$", "i") }
        ]
      });

      if (existingGarage) {
        linkedGarageId = existingGarage.id;
        finalGarageName = existingGarage.name;
        existingGarage.ownerName = name.trim();
        existingGarage.phone = garagePhone;
        existingGarage.updatedAt = new Date();
        await existingGarage.save();
      } else {
        const newGarageId = `GAR-${Date.now()}`;
        const newGarage = new Garage({
          id: newGarageId,
          name: finalGarageName,
          address: address || district || "Pune, Maharashtra",
          city: district || "Pune",
          lat: toStoredCoordinate(lat) || (18.5204 + (Math.random() - 0.5) * 0.05),
          lng: toStoredCoordinate(lng) || (73.8567 + (Math.random() - 0.5) * 0.05),
          verified: false,
          rating: 4.8,
          etaMinutes: 14,
          phone: garagePhone,
          hours: "8:00 AM - 9:00 PM",
          ownerName: name.trim(),
          mechanic: name.trim(),
          services: ["General Service", "Oil Change", "Brake Repair", "Diagnostics", "Roadside Assistance"],
          vehicleTypes: ["Car", "Bike", "SUV"],
          available: true
        });

        await newGarage.save();
        linkedGarageId = newGarageId;
      }
    }

    // Upsert User strictly scoped to { mobile, role }
    const user = await User.findOneAndUpdate(
      { mobile: normalizedMobile, role: selectedRole },
      {
        $set: {
          name: name.trim(),
          email: email ? email.trim() : "",
          role: selectedRole,
          district: district || "Pune",
          state: state || "Maharashtra",
          garageId: linkedGarageId,
          lat: toStoredCoordinate(lat),
          lng: toStoredCoordinate(lng),
          updatedAt: new Date()
        },
        $setOnInsert: {
          id: `${selectedRole === "garage_owner" ? "OWN" : "USR"}-${Date.now()}`,
          createdAt: new Date()
        }
      },
      { returnDocument: "after", upsert: true }
    );

    if (linkedGarageId) {
      await Garage.updateOne(
        { id: linkedGarageId },
        { $set: { ownerId: user.id, ownerName: name.trim(), phone: `+91${normalizedMobile}`, updatedAt: new Date() } }
      );
    }

    clearOtp(normalizedMobile);

    const sessionObj = toSessionUser(user, selectedRole);
    if (finalGarageName) sessionObj.garageName = finalGarageName;

    await recordSuccessfulLogin(sessionObj, req, selectedRole);

    return res.json({
      message: "Account created successfully",
      user: sessionObj
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ message: "Signup failed: " + error.message });
  }
}

async function sendOtpHandler(req, res) {
  const mode = req.body?.mode || "signin";
  if (mode === "signup") {
    return signupOtpHandler(req, res);
  }
  return signinOtpHandler(req, res);
}

async function verifyOtpHandler(req, res) {
  return verifySigninHandler(req, res);
}

async function checkAccountHandler(req, res) {
  try {
    const { name, mobile, role } = req.query;
    const normalizedMobile = normalizeMobile(mobile);
    const selectedRole = validateRole(role);

    if (!/^\d{10}$/.test(normalizedMobile)) {
      return res.status(400).json({ message: "Invalid mobile number." });
    }

    if (normalizedMobile === ADMIN_MOBILE) {
      return res.json({ exists: true, user: { name: "System Administrator", role: "admin" } });
    }

    const query = { mobile: normalizedMobile, role: selectedRole };
    if (name) {
      query.name = new RegExp("^" + escapeRegex(name.trim()) + "$", "i");
    }

    const user = await User.findOne(query);
    return res.json({ exists: Boolean(user), user: user ? { name: user.name, role: user.role } : null });
  } catch (error) {
    console.error("Check account error:", error);
    return res.status(500).json({ message: "Could not check account." });
  }
}

async function getProfileHandler(req, res) {
  try {
    if (!req.user || !req.isAuthenticated) {
      return res.status(401).json({ message: "Authentication required to view profile." });
    }

    const query = { mobile: req.user.mobile };
    if (req.user.role) query.role = req.user.role;
    let user = await User.findOne(query) || (req.user.id ? await User.findOne({ id: req.user.id }) : null);
    if (!user) {
      return res.status(404).json({ message: "User account not found." });
    }

    let garageName = null;
    if (user.role === "garage_owner" && user.garageId) {
      const garage = await Garage.findOne({ id: user.garageId });
      if (garage) garageName = garage.name;
    }

    const sessionObj = toSessionUser(user, req.user.role);
    if (garageName) sessionObj.garageName = garageName;

    return res.json({ user: sessionObj });
  } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({ message: "Failed to fetch profile: " + error.message });
  }
}

async function updateProfileHandler(req, res) {
  try {
    if (!req.user || !req.isAuthenticated) {
      return res.status(401).json({ message: "Authentication required to update profile." });
    }

    const { name, email, district, state } = req.body || {};
    const normalizedName = String(name || "").trim();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedDistrict = String(district || "").trim();
    const normalizedState = String(state || "").trim();

    if (!normalizedName) {
      return res.status(400).json({ message: "Name cannot be empty." });
    }

    if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ message: "Please provide a valid email address." });
    }

    const filter = { mobile: req.user.mobile };
    if (req.user.role) filter.role = req.user.role;

    const updatedUser = await User.findOneAndUpdate(
      filter,
      {
        $set: {
          name: normalizedName,
          email: normalizedEmail,
          district: normalizedDistrict || "Pune",
          state: normalizedState || "Maharashtra",
          updatedAt: new Date()
        }
      },
      { returnDocument: "after" }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User account not found." });
    }

    if (updatedUser.role === "garage_owner" && updatedUser.garageId) {
      await Garage.updateOne(
        { id: updatedUser.garageId },
        { $set: { ownerName: normalizedName, updatedAt: new Date() } }
      );
    }

    let garageName = null;
    if (updatedUser.role === "garage_owner" && updatedUser.garageId) {
      const garage = await Garage.findOne({ id: updatedUser.garageId });
      if (garage) garageName = garage.name;
    }

    const sessionObj = toSessionUser(updatedUser);
    if (garageName) sessionObj.garageName = garageName;

    return res.json({
      message: "Profile updated successfully.",
      user: sessionObj
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({ message: "Failed to update profile: " + error.message });
  }
}

module.exports = {
  ADMIN_MOBILE,
  checkAccountHandler,
  getProfileHandler,
  sendOtpHandler,
  signinOtpHandler,
  signupHandler,
  signupOtpHandler,
  toSessionUser,
  updateProfileHandler,
  verifyOtpHandler,
  verifySigninHandler
};
