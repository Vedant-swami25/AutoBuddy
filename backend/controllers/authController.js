const User = require("../models/User");
const Garage = require("../models/Garage");
const {
  clearOtp,
  isDemoMode,
  isOtpVerified,
  normalizeMobile,
  storeOtp,
  verifyOtp
} = require("../services/otpService");

const ADMIN_MOBILE = "9579278177";

function escapeRegex(text) {
  return String(text || "").replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

function toStoredCoordinate(value) {
  return typeof value === "number" && !isNaN(value) && value !== 0 ? value : null;
}

function toSessionUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email || "",
    mobile: user.mobile,
    district: user.district || "Pune",
    state: user.state || "Maharashtra",
    role: user.role || "user",
    garageId: user.garageId || null,
    garageName: user.garageName || null,
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
        { new: true, upsert: true }
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

    const nameRegex = new RegExp("^" + escapeRegex(normalizedName) + "$", "i");
    const user = await User.findOne({
      mobile: normalizedMobile,
      role: selectedRole,
      name: nameRegex
    });

    if (!user) {
      return res.status(404).json({
        exists: false,
        message: "Account not found. Please create an account first."
      });
    }

    const customTtl = typeof testTtlMs === "number" ? testTtlMs : null;
    const { otp, expiresAt, expiresIn } = storeOtp(normalizedMobile, selectedRole, customTtl);

    const response = {
      exists: true,
      message: "Verification code sent successfully.",
      expiresIn,
      user: {
        name: user.name,
        mobile: user.mobile,
        role: user.role
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

      return res.json({
        message: "Admin login successful",
        user: adminSession
      });
    }

    if (!normalizedName) {
      return res.status(400).json({ message: "Name is required for Sign In." });
    }

    const nameRegex = new RegExp("^" + escapeRegex(normalizedName) + "$", "i");
    const user = await User.findOne({
      mobile: normalizedMobile,
      role: selectedRole,
      name: nameRegex
    });

    if (!user) {
      return res.status(404).json({
        message: "Account not found. Please create an account first."
      });
    }

    const result = verifyOtp(normalizedMobile, otp);
    if (!result.ok) {
      return res.status(401).json({ message: result.message });
    }

    clearOtp(normalizedMobile);

    let garageName = null;
    if (user.garageId) {
      const garage = await Garage.findOne({ id: user.garageId });
      if (garage) garageName = garage.name;
    }

    const sessionObj = toSessionUser(user);
    if (garageName) sessionObj.garageName = garageName;

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

    // If Garage Owner, check for duplicate garage name + phone
    if (selectedRole === "garage_owner" && garageName) {
      const trimmedGarageName = String(garageName).trim();
      const duplicateGarage = await Garage.findOne({
        name: new RegExp("^" + escapeRegex(trimmedGarageName) + "$", "i"),
        phone: `+91${normalizedMobile}`
      });

      if (duplicateGarage) {
        return res.status(409).json({
          exists: true,
          message: `Garage "${trimmedGarageName}" already exists with this mobile number. Please Sign In instead.`
        });
      }
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

    // If garage owner, check for duplicate garage in MongoDB
    if (selectedRole === "garage_owner") {
      const garagePhone = `+91${normalizedMobile}`;
      const duplicateGarage = await Garage.findOne({
        name: new RegExp("^" + escapeRegex(finalGarageName) + "$", "i"),
        phone: garagePhone
      });

      if (duplicateGarage) {
        linkedGarageId = duplicateGarage.id;
        finalGarageName = duplicateGarage.name;
        await Garage.updateOne(
          { id: linkedGarageId },
          { $set: { ownerName: name.trim(), phone: garagePhone, updatedAt: new Date() } }
        );
      } else {
        const newGarageId = `GAR-${Date.now()}`;
        const newGarage = new Garage({
          id: newGarageId,
          name: finalGarageName,
          address: address || district || "Pune, Maharashtra",
          city: district || "Pune",
          lat: toStoredCoordinate(lat) || (18.5204 + (Math.random() - 0.5) * 0.05),
          lng: toStoredCoordinate(lng) || (73.8567 + (Math.random() - 0.5) * 0.05),
          verified: true,
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

    // Upsert User
    const user = await User.findOneAndUpdate(
      { mobile: normalizedMobile },
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
      { new: true, upsert: true }
    );

    if (linkedGarageId) {
      await Garage.updateOne(
        { id: linkedGarageId },
        { $set: { ownerId: user.id, ownerName: name.trim(), phone: `+91${normalizedMobile}`, updatedAt: new Date() } }
      );
    }

    clearOtp(normalizedMobile);

    const sessionObj = toSessionUser(user);
    if (finalGarageName) sessionObj.garageName = finalGarageName;

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

module.exports = {
  ADMIN_MOBILE,
  checkAccountHandler,
  sendOtpHandler,
  signinOtpHandler,
  signupHandler,
  signupOtpHandler,
  toSessionUser,
  verifyOtpHandler,
  verifySigninHandler
};
