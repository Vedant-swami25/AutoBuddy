const express = require("express");
const { authenticate } = require("../middleware/auth");
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

// Specific and universal routes
router.post("/signin-otp", signinOtpHandler);
router.post("/verify-signin", verifySigninHandler);
router.post("/signin", verifySigninHandler);
router.post("/signup-otp", signupOtpHandler);
router.post("/signup", signupHandler);

// Profile routes (requires authentication)
router.get("/me", authenticate, getProfileHandler);
router.get("/profile", authenticate, getProfileHandler);
router.put("/profile", authenticate, updateProfileHandler);

// Aliases
router.post("/send-otp", sendOtpHandler);
router.post("/otp/send", sendOtpHandler);
router.post("/verify-otp", verifyOtpHandler);
router.post("/otp/verify", verifyOtpHandler);
router.get("/check-account", checkAccountHandler);
router.get("/check", checkAccountHandler);

module.exports = router;
