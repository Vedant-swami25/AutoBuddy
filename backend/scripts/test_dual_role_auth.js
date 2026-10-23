require("dotenv").config();
const assert = require("assert");
const http = require("http");
const express = require("express");
const cors = require("cors");
const { connectDatabase } = require("../config/database");
const apiRoutes = require("../routes");
const LoginHistory = require("../models/LoginHistory");
const User = require("../models/User");
const Garage = require("../models/Garage");

async function runDualRoleTests() {
  console.log("==================================================");
  console.log("TESTING DUAL-ROLE AUTHENTICATION & AUDIT SYSTEM");
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
      console.log(`Test server running at ${baseUrl}`);
      resolve();
    });
  });

  async function api(path, options = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      headers: { "Content-Type": "application/json", "x-test-suite": "true", ...(options.headers || {}) },
      ...options
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, ok: res.ok, data };
  }

  try {
    const testMobile = "9876500001";
    const testName = "Same Person";

    // Clean up test data
    await User.deleteMany({ mobile: testMobile });
    await Garage.deleteMany({ phone: { $in: [testMobile, `+91${testMobile}`] } });
    await LoginHistory.deleteMany({ mobile: testMobile });

    // ----------------------------------------------------
    // STEP 1: Strict Validation - Unregistered Account
    // ----------------------------------------------------
    console.log("\n[STEP 1] Validating Unregistered Account Sign-In Rejection...");

    const userSigninPre = await api("/api/auth/signin-otp", {
      method: "POST",
      body: JSON.stringify({ name: testName, mobile: testMobile, role: "user" })
    });
    assert.strictEqual(userSigninPre.status, 404, "User signin must return 404 when not registered");
    assert.strictEqual(userSigninPre.data.exists, false);
    assert(userSigninPre.data.redirect.includes("role=user"), "Must redirect to User Sign Up");
    console.log("  ✓ Unregistered User sign-in correctly rejected with 404 & User Sign Up redirect");

    const ownerSigninPre = await api("/api/auth/signin-otp", {
      method: "POST",
      body: JSON.stringify({ name: testName, mobile: testMobile, role: "garage_owner" })
    });
    assert.strictEqual(ownerSigninPre.status, 404, "Garage Owner signin must return 404 when not registered");
    assert.strictEqual(ownerSigninPre.data.exists, false);
    assert(ownerSigninPre.data.redirect.includes("role=owner"), "Must redirect to Garage Owner Sign Up");
    console.log("  ✓ Unregistered Garage Owner sign-in correctly rejected with 404 & Garage Owner Sign Up redirect");

    // ----------------------------------------------------
    // STEP 2: Register as User
    // ----------------------------------------------------
    console.log("\n[STEP 2] Registering account as 'User'...");

    const userSignupOtp = await api("/api/auth/signup-otp", {
      method: "POST",
      body: JSON.stringify({ name: testName, mobile: testMobile, role: "user" })
    });
    assert.strictEqual(userSignupOtp.status, 200);

    const userSignup = await api("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: testName,
        mobile: testMobile,
        role: "user",
        district: "Pune",
        state: "Maharashtra",
        otp: userSignupOtp.data.demoOtp
      })
    });
    assert.strictEqual(userSignup.status, 200);
    assert.strictEqual(userSignup.data.user.role, "user");
    console.log("  ✓ Successfully registered User account");

    // ----------------------------------------------------
    // STEP 3: Ensure User account cannot sign in as Garage Owner
    // ----------------------------------------------------
    console.log("\n[STEP 3] Verifying User account cannot sign in as Garage Owner...");

    const ownerSigninWithUserOnly = await api("/api/auth/signin-otp", {
      method: "POST",
      body: JSON.stringify({ name: testName, mobile: testMobile, role: "garage_owner" })
    });
    assert.strictEqual(ownerSigninWithUserOnly.status, 404, "Must NOT allow Garage Owner login when only User account exists");
    assert.strictEqual(ownerSigninWithUserOnly.data.exists, false);
    assert(ownerSigninWithUserOnly.data.redirect.includes("role=owner"));
    console.log("  ✓ Garage Owner sign-in properly blocked for user who only has User account");

    // ----------------------------------------------------
    // STEP 4: Sign in as User
    // ----------------------------------------------------
    console.log("\n[STEP 4] Signing in as 'User'...");

    const userSigninOtp = await api("/api/auth/signin-otp", {
      method: "POST",
      body: JSON.stringify({ name: testName, mobile: testMobile, role: "user" })
    });
    assert.strictEqual(userSigninOtp.status, 200);

    const userVerify = await api("/api/auth/verify-signin", {
      method: "POST",
      body: JSON.stringify({
        name: testName,
        mobile: testMobile,
        role: "user",
        otp: userSigninOtp.data.demoOtp
      })
    });
    assert.strictEqual(userVerify.status, 200);
    assert.strictEqual(userVerify.data.user.role, "user");
    console.log("  ✓ Successfully signed in as User");

    // ----------------------------------------------------
    // STEP 5: Register SAME person with SAME mobile as 'Garage Owner'
    // ----------------------------------------------------
    console.log("\n[STEP 5] Registering SAME mobile & name as 'Garage Owner' (Dual Role Creation)...");

    const ownerSignupOtp = await api("/api/auth/signup-otp", {
      method: "POST",
      body: JSON.stringify({ name: testName, mobile: testMobile, role: "garage_owner", garageName: "Apex Auto Workshop" })
    });
    assert.strictEqual(ownerSignupOtp.status, 200);

    const ownerSignup = await api("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: testName,
        mobile: testMobile,
        role: "garage_owner",
        garageName: "Apex Auto Workshop",
        district: "Pune",
        state: "Maharashtra",
        otp: ownerSignupOtp.data.demoOtp
      })
    });
    assert.strictEqual(ownerSignup.status, 200);
    assert.strictEqual(ownerSignup.data.user.role, "garage_owner");
    assert(ownerSignup.data.user.garageId, "Must have linked garageId");
    console.log("  ✓ Successfully registered Garage Owner account for the same person");

    // ----------------------------------------------------
    // STEP 6: Verify MongoDB stores BOTH accounts independently
    // ----------------------------------------------------
    console.log("\n[STEP 6] Inspecting MongoDB for both distinct account records...");

    const dbUsers = await User.find({ mobile: testMobile });
    assert.strictEqual(dbUsers.length, 2, "Must have exactly 2 documents in MongoDB for this mobile");
    const roles = dbUsers.map((u) => u.role).sort();
    assert.deepStrictEqual(roles, ["garage_owner", "user"], "One must be garage_owner and one must be user");
    console.log(`  ✓ MongoDB contains 2 distinct records for mobile ${testMobile}:`);
    dbUsers.forEach((u) => console.log(`    - ID: ${u.id}, Name: "${u.name}", Role: "${u.role}", GarageId: ${u.garageId}`));

    // ----------------------------------------------------
    // STEP 7: Sign in as Garage Owner
    // ----------------------------------------------------
    console.log("\n[STEP 7] Signing in as 'Garage Owner'...");

    const ownerSigninOtp = await api("/api/auth/signin-otp", {
      method: "POST",
      body: JSON.stringify({ name: testName, mobile: testMobile, role: "garage_owner" })
    });
    assert.strictEqual(ownerSigninOtp.status, 200);
    assert.strictEqual(ownerSigninOtp.data.user.role, "garage_owner");

    const ownerVerify = await api("/api/auth/verify-signin", {
      method: "POST",
      body: JSON.stringify({
        name: testName,
        mobile: testMobile,
        role: "garage_owner",
        otp: ownerSigninOtp.data.demoOtp
      })
    });
    assert.strictEqual(ownerVerify.status, 200);
    assert.strictEqual(ownerVerify.data.user.role, "garage_owner");
    assert(ownerVerify.data.user.garageId, "Session must have garageId");
    console.log("  ✓ Successfully signed in as Garage Owner with garageId");

    // ----------------------------------------------------
    // STEP 8: Check Recent Logins shows the ACTUAL role used
    // ----------------------------------------------------
    console.log("\n[STEP 8] Verifying Administrator Recent Logins displays ACTUAL login roles...");

    const recentRes = await api("/api/admin/recent-logins", {
      headers: { "x-admin-mobile": "9579278177" }
    });
    assert.strictEqual(recentRes.status, 200);
    const userLogins = recentRes.data.filter((item) => item.mobile === testMobile);
    assert(userLogins.length >= 2, "Must have recorded both login events for this user");

    const hasGarageOwnerLogin = userLogins.some((item) => item.role === "garage_owner" && item.roleLabel === "Garage Owner");
    const hasUserLogin = userLogins.some((item) => item.role === "user" && item.roleLabel === "User");

    assert(hasGarageOwnerLogin, "Recent Logins MUST show 'Garage Owner' for the garage owner login event");
    assert(hasUserLogin, "Recent Logins MUST show 'User' for the user login event");
    console.log("  ✓ Recent Logins audit verified:");
    userLogins.slice(0, 4).forEach((l) => console.log(`    - ${l.name} (${l.mobile}) logged in as: "${l.roleLabel}" (role: ${l.role})`));

    // ----------------------------------------------------
    // STEP 9: Session Role-Based Profile Resolution
    // ----------------------------------------------------
    console.log("\n[STEP 9] Verifying Session Headers Resolve Correct Role Profile...");

    // Fetch profile with garage_owner session
    const ownerProfile = await api("/api/auth/profile", {
      headers: {
        "x-user-mobile": testMobile,
        "x-user-role": "garage_owner"
      }
    });
    assert.strictEqual(ownerProfile.status, 200);
    assert.strictEqual(ownerProfile.data.user.role, "garage_owner");
    assert(ownerProfile.data.user.garageId, "Garage owner profile must have garageId");
    console.log("  ✓ Profile requested with 'x-user-role: garage_owner' returned Garage Owner profile");

    // Fetch profile with user session
    const customerProfile = await api("/api/auth/profile", {
      headers: {
        "x-user-mobile": testMobile,
        "x-user-role": "user"
      }
    });
    assert.strictEqual(customerProfile.status, 200);
    assert.strictEqual(customerProfile.data.user.role, "user");
    console.log("  ✓ Profile requested with 'x-user-role: user' returned User profile");

    // ----------------------------------------------------
    // STEP 10: Admin Authentication
    // ----------------------------------------------------
    console.log("\n[STEP 10] Verifying System Administrator Login...");

    const adminOtpReq = await api("/api/auth/signin-otp", {
      method: "POST",
      body: JSON.stringify({ mobile: "9579278177", role: "admin" })
    });
    assert.strictEqual(adminOtpReq.status, 200);

    const adminVerify = await api("/api/auth/verify-signin", {
      method: "POST",
      body: JSON.stringify({
        mobile: "9579278177",
        role: "admin",
        otp: adminOtpReq.data.demoOtp
      })
    });
    assert.strictEqual(adminVerify.status, 200);
    assert.strictEqual(adminVerify.data.user.role, "admin");
    console.log("  ✓ System Administrator login verified");

    console.log("\n==================================================");
    console.log("ALL DUAL-ROLE AUTH & AUDIT TESTS PASSED 100%!");
    console.log("==================================================");
  } finally {
    if (server) server.close();
    const { mongoose } = require("../config/database");
    await mongoose.disconnect();
    process.exit(0);
  }
}

runDualRoleTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
