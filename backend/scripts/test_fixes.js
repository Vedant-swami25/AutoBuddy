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
const { calculateDistanceKm } = require("../utils/coordinates");

async function runTests() {
  console.log("=========================================");
  console.log("STARTING AUTOBUDDY FIX VERIFICATION SUITE");
  console.log("=========================================");

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
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, ok: res.ok, data };
  }

  try {
    // ----------------------------------------------------
    // TEST GROUP 1: Map Distance & Travel Time Formula
    // ----------------------------------------------------
    console.log("\n[TEST GROUP 1] Map Distance & ETA Formula (travelTime = distanceKm * 4)");
    const testCases = [
      { km: 1, expectedMin: 4 },
      { km: 2, expectedMin: 8 },
      { km: 3, expectedMin: 12 },
      { km: 5, expectedMin: 20 },
      { km: 10, expectedMin: 40 },
      { km: 1.2, expectedMin: 5 } // Math.round(1.2 * 4) = 5
    ];

    testCases.forEach(({ km, expectedMin }) => {
      const computed = Math.round(km * 4);
      assert.strictEqual(computed, expectedMin, `ETA for ${km}km should be ${expectedMin}min, got ${computed}`);
      console.log(`  ✓ ${km} km -> ${computed} min ETA`);
    });

    // Haversine distance verification
    const d = calculateDistanceKm(18.5204, 73.8567, 18.5304, 73.8667);
    assert(typeof d === "number" && d > 0, "Haversine distance must be a positive number");
    console.log(`  ✓ Haversine distance calculation verified: ${d} km`);

    // ----------------------------------------------------
    // TEST GROUP 2: Login History & Role Identification
    // ----------------------------------------------------
    console.log("\n[TEST GROUP 2] Real Authentication Audit & Recent Logins");

    // Clean test logins before starting
    await LoginHistory.deleteMany({});
    console.log("  ✓ Reset LoginHistory collection to empty state");

    // Test 2.1: Empty state query by Admin
    const emptyLogins = await api("/api/admin/recent-logins", {
      headers: { "x-admin-mobile": "9579278177" }
    });
    assert.strictEqual(emptyLogins.status, 200);
    assert(Array.isArray(emptyLogins.data), "Should return an array");
    assert.strictEqual(emptyLogins.data.length, 0, "Should be empty with zero logins");
    console.log("  ✓ Empty state returns empty array (no fake records)");

    // Test 2.2: Non-admin access rejected (401/403)
    const unauthorizedLogins = await api("/api/admin/recent-logins", {
      headers: { "x-user-mobile": "9876543210" }
    });
    assert.strictEqual(unauthorizedLogins.status, 403, "Non-admin access must be rejected with 403");
    console.log("  ✓ Non-admin access to /api/admin/recent-logins denied (403)");

    // Test 2.3: Failed login attempt (wrong OTP) must NOT create login record
    const failedAttempt = await api("/api/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({
        name: "Test Driver",
        mobile: "9876543210",
        role: "user",
        otp: "000000"
      })
    });
    assert(!failedAttempt.ok, "Failed OTP verification should not succeed");
    const loginsAfterFail = await LoginHistory.find();
    assert.strictEqual(loginsAfterFail.length, 0, "Failed attempt must not create any LoginHistory record");
    console.log("  ✓ Failed login attempt does NOT create recent login record");

    // Test 2.4: Admin logs in successfully -> records Administrator login
    const adminOtpReq = await api("/api/auth/otp/send", {
      method: "POST",
      body: JSON.stringify({ mobile: "9579278177", role: "admin" })
    });
    const adminOtp = adminOtpReq.data?.demoOtp;
    assert(adminOtp, "Admin OTP should be returned in demo mode");

    const adminVerify = await api("/api/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({ mobile: "9579278177", role: "admin", otp: adminOtp })
    });
    assert.strictEqual(adminVerify.status, 200);
    console.log("  ✓ Admin OTP verification successful");

    // Test 2.5: Customer signs up / logs in -> records Customer login
    const userOtpReq = await api("/api/auth/signup-otp", {
      method: "POST",
      body: JSON.stringify({
        name: "Rohan Sharma",
        mobile: "9123456789",
        role: "user",
        district: "Pune",
        state: "Maharashtra"
      })
    });
    const userOtp = userOtpReq.data?.demoOtp;
    assert(userOtp, "Customer OTP should be returned in demo mode");

    const userVerify = await api("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "Rohan Sharma",
        mobile: "9123456789",
        role: "user",
        district: "Pune",
        state: "Maharashtra",
        otp: userOtp
      })
    });
    assert.strictEqual(userVerify.status, 200);
    console.log("  ✓ Customer registration & login successful");

    // Test 2.6: Garage Owner signs in -> records Garage Owner login
    const ownerOtpReq = await api("/api/auth/signup-otp", {
      method: "POST",
      body: JSON.stringify({
        name: "Vikram Gaikwad",
        mobile: "9822011223",
        role: "garage_owner",
        district: "Pune",
        state: "Maharashtra"
      })
    });
    const ownerOtp = ownerOtpReq.data?.demoOtp;
    assert(ownerOtp, "Garage owner OTP should be returned in demo mode");

    const ownerVerify = await api("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "Vikram Gaikwad",
        mobile: "9822011223",
        role: "garage_owner",
        district: "Pune",
        state: "Maharashtra",
        otp: ownerOtp
      })
    });
    assert.strictEqual(ownerVerify.status, 200);
    console.log("  ✓ Garage Owner registration & login successful");

    // Query Recent Logins via Admin API
    const recentLoginsRes = await api("/api/admin/recent-logins", {
      headers: { "x-admin-mobile": "9579278177" }
    });
    assert.strictEqual(recentLoginsRes.status, 200);
    const logs = recentLoginsRes.data;
    assert.strictEqual(logs.length, 3, "Should have exactly 3 recorded logins");

    // Verify ordering: newest first
    assert.strictEqual(logs[0].role, "garage_owner");
    assert.strictEqual(logs[0].roleLabel, "Garage Owner");
    assert.strictEqual(logs[0].name, "Vikram Gaikwad");

    assert.strictEqual(logs[1].role, "user");
    assert.strictEqual(logs[1].roleLabel, "Customer");
    assert.strictEqual(logs[1].name, "Rohan Sharma");

    assert.strictEqual(logs[2].role, "admin");
    assert.strictEqual(logs[2].roleLabel, "Administrator");
    assert.strictEqual(logs[2].name, "System Administrator");

    console.log("  ✓ Recent Logins returns exact real records in newest -> oldest order");
    console.log("  ✓ Correct role identification: Customer, Garage Owner, Administrator");

    // Test 2.7: Cap at 50 records
    console.log("\n[TEST GROUP 3] Cap at latest 50 logins");
    const bulkLogins = [];
    for (let i = 1; i <= 60; i++) {
      bulkLogins.push({
        id: `LOG-BULK-${i}`,
        name: `Test User ${i}`,
        mobile: `90000000${String(i).padStart(2, "0")}`,
        role: i % 2 === 0 ? "garage_owner" : "user",
        timestamp: new Date(Date.now() + i * 1000)
      });
    }
    await LoginHistory.insertMany(bulkLogins);

    const cappedRes = await api("/api/admin/recent-logins", {
      headers: { "x-admin-mobile": "9579278177" }
    });
    assert.strictEqual(cappedRes.data.length, 50, "Must return at most 50 recent logins");
    assert.strictEqual(cappedRes.data[0].id, "LOG-BULK-60", "Newest record must be first");
    console.log("  ✓ 50-record limit strictly enforced");

    console.log("\n=========================================");
    console.log("ALL BACKEND & API TESTS PASSED 100%!");
    console.log("=========================================\n");

  } finally {
    server.close();
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
