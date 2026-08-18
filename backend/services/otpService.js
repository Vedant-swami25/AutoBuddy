/**
 * AutoBuddy Robust OTP Authentication Service
 * 10-minute validity window with precise UTC timestamps.
 */

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes for active OTP entry
const VERIFIED_WINDOW_MS = 15 * 60 * 1000; // 15 minutes window for completing registration
const otpStore = new Map();

function normalizeMobile(mobile) {
  return String(mobile || "").replace(/\D/g, "").slice(-10);
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function storeOtp(mobile, role, customTtlMs = null) {
  const key = normalizeMobile(mobile);
  const otp = generateOtp();
  const ttl = typeof customTtlMs === "number" ? customTtlMs : OTP_TTL_MS;
  const now = Date.now();
  const expiresAt = now + ttl;

  otpStore.set(key, {
    otp,
    role,
    createdAt: now,
    expiresAt,
    verified: false,
    verifiedUntil: 0
  });

  return {
    otp,
    expiresAt,
    expiresIn: Math.max(0, Math.floor((expiresAt - now) / 1000))
  };
}

function getEntry(mobile) {
  const key = normalizeMobile(mobile);
  const entry = otpStore.get(key);

  if (!entry) {
    return null;
  }

  // If already verified, allow access within verified window
  if (entry.verified) {
    if (Date.now() > entry.verifiedUntil) {
      otpStore.delete(key);
      return null;
    }
    return entry;
  }

  // Active unverified OTP check
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(key);
    return null;
  }

  return entry;
}

function verifyOtp(mobile, otp) {
  const key = normalizeMobile(mobile);
  const rawEntry = otpStore.get(key);

  if (!rawEntry) {
    return { ok: false, message: "No active verification code found. Please request a new code." };
  }

  const now = Date.now();

  // If already verified previously within window, consider valid
  if (rawEntry.verified && now <= rawEntry.verifiedUntil) {
    return { ok: true, role: rawEntry.role };
  }

  // Check expiration
  if (now > rawEntry.expiresAt) {
    otpStore.delete(key);
    return { ok: false, message: "Verification code has expired. Please request a new code." };
  }

  // Check code match
  if (String(otp).trim() !== String(rawEntry.otp).trim()) {
    return { ok: false, message: "Invalid verification code. Please check the code and try again." };
  }

  // Mark verified with extended registration window
  rawEntry.verified = true;
  rawEntry.verifiedUntil = now + VERIFIED_WINDOW_MS;

  return { ok: true, role: rawEntry.role };
}

function isOtpVerified(mobile) {
  const key = normalizeMobile(mobile);
  const entry = otpStore.get(key);
  if (!entry) return false;
  return Boolean(entry.verified && Date.now() <= entry.verifiedUntil);
}

function clearOtp(mobile) {
  otpStore.delete(normalizeMobile(mobile));
}

function isDemoMode() {
  return process.env.NODE_ENV !== "production" || process.env.OTP_DEMO_MODE === "true";
}

module.exports = {
  clearOtp,
  isDemoMode,
  isOtpVerified,
  normalizeMobile,
  storeOtp,
  verifyOtp
};
