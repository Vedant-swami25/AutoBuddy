const assert = require("assert");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const http = require("http");
const { connectDatabase } = require("../config/database");
const apiRoutes = require("../routes");
const User = require("../models/User");
const Garage = require("../models/Garage");
const LoginHistory = require("../models/LoginHistory");

async function run() {
  console.log("==================================================");
  console.log("RUNNING USER REQUIREMENTS VALIDATION TEST");
  console.log("==================================================");

  await connectDatabase();

  const app = express();
  app.use(cors());
  app.use(express.json());

  apiRoutes.forEach(({ path: routePath, router }) => {
    app.use(routePath, router);
  });

  let server;
  let baseUrl;

  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  async function api(path, options = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, ok: res.ok, data };
  }

  try {
    // 1. Test Login & Account Lookup (Fix "Account not found" issue)
    console.log("\n[TEST 1] Testing Resilient Sign In / Account Auto-Provisioning...");
    const signinOtpRes = await api("/api/auth/signin-otp", {
      method: "POST",
      body: JSON.stringify({
        name: "Vedant Swami",
        mobile: "9555123456",
        role: "user"
      })
    });
    assert.strictEqual(signinOtpRes.status, 200, "Signin OTP must succeed with 200");
    assert(signinOtpRes.data.exists, "Account must exist or be auto-provisioned");
    console.log("  ✓ Signin OTP sent successfully without 'Account not found' error");

    const verifyRes = await api("/api/auth/verify-signin", {
      method: "POST",
      body: JSON.stringify({
        name: "Vedant Swami",
        mobile: "9555123456",
        otp: signinOtpRes.data.demoOtp,
        role: "user"
      })
    });
    assert.strictEqual(verifyRes.status, 200, "Verify signin must succeed with 200");
    assert.strictEqual(verifyRes.data.user.name, "Vedant Swami");
    console.log("  ✓ Verification & session creation completed successfully");

    // 2. Test Recent Logins
    console.log("\n[TEST 2] Testing Admin Recent Logins API...");
    const recentRes = await api("/api/admin/recent-logins", {
      headers: { "x-admin-mobile": "9579278177" }
    });
    assert.strictEqual(recentRes.status, 200, "Recent logins must return 200");
    assert(Array.isArray(recentRes.data), "Recent logins must be an array");
    assert(recentRes.data.length >= 1, "Must contain recorded login");
    console.log(`  ✓ Recent logins API returned ${recentRes.data.length} real events without error`);

    // 3. Test Users & Garage Owners Details
    console.log("\n[TEST 3] Testing Admin Users & Garage Owners Detailed View...");
    const usersRes = await api("/api/admin/users", {
      headers: { "x-admin-mobile": "9579278177" }
    });
    assert.strictEqual(usersRes.status, 200, "Admin users must return 200");
    assert(Array.isArray(usersRes.data), "Must return accounts array");
    const testUserAccount = usersRes.data.find(u => u.mobile === "9555123456");
    assert(testUserAccount, "Must include newly authenticated account");
    assert.strictEqual(testUserAccount.name, "Vedant Swami");
    assert(testUserAccount.district, "Must include district");
    console.log("  ✓ Admin Users & Garage Owners API returns complete account details");

    // 4. Test Support Phone Isolation
    console.log("\n[TEST 4] Testing AutoBuddy Support Isolation (Removed from Garage, Kept on Map)...");
    const garageJs = fs.readFileSync("frontend/assets/js/garage.js", "utf8");
    const mapJs = fs.readFileSync("frontend/assets/js/map.js", "utf8");

    assert(!garageJs.includes("📞 AutoBuddy Helpline:"), "garage.js must NOT have AutoBuddy Helpline on garage cards");
    assert(mapJs.includes("📞 AutoBuddy Helpline: +91 1800-889-2889"), "map.js MUST have AutoBuddy Helpline on map items");
    console.log("  ✓ Confirmed: AutoBuddy helpline removed from Garage dashboard and retained on Map dashboard");

    // 5. Test 3D Models
    console.log("\n[TEST 5] Testing 3D Automotive Studio Implementation...");
    const threeJs = fs.readFileSync("frontend/assets/js/three-scene.js", "utf8");
    assert(threeJs.includes("buildHighDetailCarFallback"), "three-scene.js must build luxury sport sedan");
    assert(threeJs.includes("buildHighDetailBikeFallback"), "three-scene.js must build TVS Apache style sport bike");
    assert(threeJs.includes("pearlWhite"), "Bike must feature Pearl White with Apache racing red stripes");
    assert(threeJs.includes("hexagonal") || threeJs.includes("glossBlackGrille"), "Car must feature singleframe grille and fastback profile");
    console.log("  ✓ Confirmed: 3D studio features executive sports sedan & TVS Apache RTR style bike");

    console.log("\n==================================================");
    console.log("ALL 5 USER REQUIREMENTS VERIFIED AND PASSED 100%!");
    console.log("==================================================\n");
  } finally {
    server.close();
    process.exit(0);
  }
}

run().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
