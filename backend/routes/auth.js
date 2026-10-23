const express = require("express");
const { authenticate } = require("../middleware/auth");
const { otpRateLimiter } = require("../middleware/rateLimiter");
const {
  checkAccountHandler,
  getProfileHandler,
  sendOtpHandler,
  signinOtpHandler,
  signupHandler,
  signupOtpHandler,
  updateProfileHandler,
  verifyOtpHandler,
  verifySigninHandler
} = require("../controllers/authController");

const router = express.Router();

// Apply rate limiting to OTP endpoints
router.post("/signin-otp", otpRateLimiter, signinOtpHandler);
router.post("/verify-signin", verifySigninHandler);
router.post("/signin", verifySigninHandler);
router.post("/signup-otp", otpRateLimiter, signupOtpHandler);
router.post("/signup", signupHandler);

// Profile routes (requires authentication)
router.get("/me", authenticate, getProfileHandler);
router.get("/profile", authenticate, getProfileHandler);
router.put("/profile", authenticate, updateProfileHandler);

// Aliases
router.post("/send-otp", otpRateLimiter, sendOtpHandler);
router.post("/otp/send", otpRateLimiter, sendOtpHandler);
router.post("/verify-otp", verifyOtpHandler);
router.post("/otp/verify", verifyOtpHandler);
router.get("/check-account", checkAccountHandler);
router.get("/check", checkAccountHandler);

module.exports = router;
