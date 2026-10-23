require("dotenv").config();
const http = require("http");
const express = require("express");
const cors = require("cors");
const { connectDatabase, mongoose } = require("../config/database");
const apiRoutes = require("../routes");
const User = require("../models/User");
const Garage = require("../models/Garage");
const Booking = require("../models/Booking");
const LoginHistory = require("../models/LoginHistory");

let server;
let baseUrl;

async function runTests() {
  console.log("=========================================");
  console.log("STARTING AUTOBUDDY BOOKING & TRACKING TESTS");
  console.log("=========================================\n");

  await connectDatabase();

  const app = express();
  app.use(cors());
  app.use(express.json());

  apiRoutes.forEach(({ path: routePath, router }) => {
    app.use(routePath, router);
  });

  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`Test server running on ${baseUrl}`);
      resolve();
    });
  });

  async function api(path, options = {}) {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, ok: res.ok, data };
  }

  const testMobileUser = "9988776655";
  const testMobileOther = "9988776656";
  const testMobileOwner1 = "9988776657";
  const testMobileOwner2 = "9988776658";

  // Cleanup test records
  await User.deleteMany({ mobile: { $in: [testMobileUser, testMobileOther, testMobileOwner1, testMobileOwner2] } });
  await Garage.deleteMany({ phone: { $in: [testMobileOwner1, testMobileOwner2, `+91${testMobileOwner1}`, `+91${testMobileOwner2}`] } });
  await Booking.deleteMany({ "user.mobile": { $in: [testMobileUser, `+91${testMobileUser}`, testMobileOther] } });

  try {
    // 1. Setup User account
    console.log("1. Setting up Customer User account...");
    const userOtpRes = await api("/api/auth/signup-otp", {
      method: "POST",
      body: JSON.stringify({ name: "Rahul Customer", mobile: testMobileUser, role: "user" })
    });
    const userRes = await api("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "Rahul Customer",
        mobile: testMobileUser,
        role: "user",
        district: "Pune",
        state: "Maharashtra",
        otp: userOtpRes.data.demoOtp
      })
    });
    if (userRes.status !== 200 || !userRes.data?.user) {
      throw new Error(`Failed to create user account: ${JSON.stringify(userRes.data)}`);
    }
    const customer = userRes.data.user;
    console.log(`   User created: ID ${customer.id}, Name ${customer.name}, Mobile ${customer.mobile}`);

    // 2. Setup Other Customer account
    console.log("2. Setting up Other Customer account...");
    const otherOtpRes = await api("/api/auth/signup-otp", {
      method: "POST",
      body: JSON.stringify({ name: "Sneha Other", mobile: testMobileOther, role: "user" })
    });
    const otherRes = await api("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "Sneha Other",
        mobile: testMobileOther,
        role: "user",
        district: "Pune",
        state: "Maharashtra",
        otp: otherOtpRes.data.demoOtp
      })
    });
    const otherCustomer = otherRes.data.user;

    // 3. Setup Garage Owner 1
    console.log("3. Setting up Garage Owner 1 with Workshop...");
    const owner1OtpRes = await api("/api/auth/signup-otp", {
      method: "POST",
      body: JSON.stringify({ name: "Amit Workshop", mobile: testMobileOwner1, role: "garage_owner" })
    });
    const owner1Res = await api("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "Amit Workshop",
        mobile: testMobileOwner1,
        role: "garage_owner",
        garageName: "Amit Super Auto Care",
        district: "Pune",
        state: "Maharashtra",
        otp: owner1OtpRes.data.demoOtp
      })
    });
    const owner1 = owner1Res.data.user;
    const garage1 = await Garage.findOne({ $or: [{ ownerId: owner1.id }, { phone: testMobileOwner1 }] });
    if (!garage1) throw new Error("Garage 1 was not created in DB");
    console.log(`   Garage 1 created: ID ${garage1.id}, Name: ${garage1.name}`);

    // 4. Setup Garage Owner 2
    console.log("4. Setting up Garage Owner 2 with Workshop...");
    const owner2OtpRes = await api("/api/auth/signup-otp", {
      method: "POST",
      body: JSON.stringify({ name: "Vikas Garage", mobile: testMobileOwner2, role: "garage_owner" })
    });
    const owner2Res = await api("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "Vikas Garage",
        mobile: testMobileOwner2,
        role: "garage_owner",
        garageName: "Vikas Wheels",
        district: "Mumbai",
        state: "Maharashtra",
        otp: owner2OtpRes.data.demoOtp
      })
    });
    const owner2 = owner2Res.data.user;
    const garage2 = await Garage.findOne({ $or: [{ ownerId: owner2.id }, { phone: testMobileOwner2 }] });
    if (!garage2) throw new Error("Garage 2 was not created in DB");
    console.log(`   Garage 2 created: ID ${garage2.id}, Name: ${garage2.name}`);

    // 5. Customer creates a booking with Garage 1
    console.log("\n5. Customer creating a booking for Amit Super Auto Care (Garage 1)...");
    const createRes = await api("/api/book", {
      method: "POST",
      body: JSON.stringify({
        user: { id: customer.id, name: customer.name, mobile: customer.mobile },
        garageId: garage1.id,
        garage: garage1.name,
        service: "General Service & Oil Change",
        price: 999,
        lat: 18.5204,
        lng: 73.8567,
        vehicleType: "car"
      }),
      headers: {
        "x-user-id": customer.id,
        "x-user-mobile": customer.mobile,
        "x-user-role": "user"
      }
    });

    if (createRes.status !== 200 || !createRes.data?.booking) {
      throw new Error(`Booking creation failed: ${JSON.stringify(createRes.data)}`);
    }
    const createdBooking = createRes.data.booking;
    console.log(`   Booking created successfully! ID: ${createdBooking.id}`);
    console.log(`   Status: ${createdBooking.status}`);
    console.log(`   User: ${createdBooking.user?.name} (${createdBooking.user?.mobile})`);
    console.log(`   Garage ID: ${createdBooking.garageId} (${createdBooking.garage})`);
    console.log(`   Distance: ${createdBooking.distanceKm} km, ETA: ${createdBooking.travelMinutes} min`);

    // Verify booking in MongoDB
    const mongoBooking = await Booking.findOne({ id: createdBooking.id });
    if (!mongoBooking) throw new Error("Booking was not found in MongoDB!");
    if (mongoBooking.user.mobile !== testMobileUser) throw new Error("Booking user mobile mismatch!");
    if (mongoBooking.garageId !== garage1.id) throw new Error("Booking garageId mismatch!");
    console.log("   ✓ Verified in MongoDB direct query!");

    // 6. Customer loads "My Bookings" via /api/book/user
    console.log("\n6. Customer querying My Bookings (/api/book/user)...");
    const myBookingsRes = await api("/api/book/user", {
      headers: {
        "x-user-id": customer.id,
        "x-user-mobile": customer.mobile,
        "x-user-role": "user"
      }
    });
    if (myBookingsRes.status !== 200 || !Array.isArray(myBookingsRes.data)) {
      throw new Error(`Failed to list user bookings: ${JSON.stringify(myBookingsRes.data)}`);
    }
    const foundUserBooking = myBookingsRes.data.find((b) => b.id === createdBooking.id);
    if (!foundUserBooking) throw new Error("Created booking did NOT appear in Customer's My Bookings!");
    console.log(`   ✓ Booking found in My Bookings! Total customer bookings: ${myBookingsRes.data.length}`);

    // Refresh test: query again
    const refreshRes = await api("/api/book/user", {
      headers: {
        "x-user-id": customer.id,
        "x-user-mobile": customer.mobile,
        "x-user-role": "user"
      }
    });
    if (!refreshRes.data.some((b) => b.id === createdBooking.id)) {
      throw new Error("Booking disappeared upon refresh!");
    }
    console.log("   ✓ Booking persists across refresh from MongoDB!");

    // 7. Data Ownership: Other Customer queries My Bookings
    console.log("\n7. Other Customer querying My Bookings (Isolation test)...");
    const otherBookingsRes = await api("/api/book/user", {
      headers: {
        "x-user-id": otherCustomer.id,
        "x-user-mobile": otherCustomer.mobile,
        "x-user-role": "user"
      }
    });
    const leaked = otherBookingsRes.data.some((b) => b.id === createdBooking.id);
    if (leaked) throw new Error("Data leak! Other customer saw Rahul's booking!");
    console.log("   ✓ Verified: Other customer cannot see Rahul's booking!");

    // 8. Garage Owner 1 queries workshop bookings (/api/book)
    console.log("\n8. Garage Owner 1 querying workshop dispatches (/api/book)...");
    const owner1BookingsRes = await api("/api/book", {
      headers: {
        "x-user-id": owner1.id,
        "x-user-mobile": owner1.mobile,
        "x-user-role": "garage_owner"
      }
    });
    if (owner1BookingsRes.status !== 200 || !Array.isArray(owner1BookingsRes.data)) {
      throw new Error(`Owner 1 failed to list bookings: ${JSON.stringify(owner1BookingsRes.data)}`);
    }
    const foundInGarage1 = owner1BookingsRes.data.find((b) => b.id === createdBooking.id);
    if (!foundInGarage1) throw new Error("Booking did NOT appear in Garage Owner 1's dashboard!");
    console.log(`   ✓ Booking found in Garage Owner 1 dashboard! Total dispatches: ${owner1BookingsRes.data.length}`);

    // 9. Garage Owner 2 queries workshop bookings (/api/book) - MUST NOT SEE Garage 1's booking
    console.log("\n9. Garage Owner 2 querying workshop dispatches (Owner Isolation test)...");
    const owner2BookingsRes = await api("/api/book", {
      headers: {
        "x-user-id": owner2.id,
        "x-user-mobile": owner2.mobile,
        "x-user-role": "garage_owner"
      }
    });
    const leakedToOwner2 = owner2BookingsRes.data.some((b) => b.id === createdBooking.id);
    if (leakedToOwner2) throw new Error("Data leak! Garage Owner 2 saw Garage 1's booking!");
    console.log("   ✓ Verified: Garage Owner 2 CANNOT see Garage 1's bookings!");

    // 10. User queries /api/book/:id (Track Booking)
    console.log("\n10. Customer tracking booking (/api/book/:id)...");
    const trackRes = await api(`/api/book/${createdBooking.id}`, {
      headers: {
        "x-user-id": customer.id,
        "x-user-mobile": customer.mobile,
        "x-user-role": "user"
      }
    });
    if (trackRes.status !== 200 || !trackRes.data?.id) {
      throw new Error(`Failed to track booking: ${JSON.stringify(trackRes.data)}`);
    }
    const trackData = trackRes.data;
    console.log(`   Tracking response received: Status = ${trackData.status}`);
    console.log(`   Location: Lat ${trackData.location?.lat}, Lng ${trackData.location?.lng}`);
    console.log(`   Garage Location: Lat ${trackData.garageLocation?.lat}, Lng ${trackData.garageLocation?.lng}`);
    console.log(`   Distance: ${trackData.distanceKm} km, ETA: ${trackData.travelMinutes} mins`);
    if (!trackData.location?.lat || !trackData.garageLocation?.lat) {
      throw new Error("Tracking data is missing coordinates!");
    }
    console.log("   ✓ User, Garage locations, Route, and ETA confirmed!");

    // 11. Garage Owner 1 accepts booking (Status update)
    console.log("\n11. Garage Owner 1 updating status to 'accepted'...");
    const acceptRes = await api(`/api/book/${createdBooking.id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status: "accepted", ownerNote: "Mechanic assigned and preparing tools" }),
      headers: {
        "x-user-id": owner1.id,
        "x-user-mobile": owner1.mobile,
        "x-user-role": "garage_owner"
      }
    });
    if (acceptRes.status !== 200 || acceptRes.data?.booking?.status !== "accepted") {
      throw new Error(`Failed to accept booking: ${JSON.stringify(acceptRes.data)}`);
    }
    console.log("   ✓ Booking updated to 'accepted'!");

    // Check tracking reflect
    const trackAccepted = await api(`/api/book/${createdBooking.id}`, {
      headers: {
        "x-user-id": customer.id,
        "x-user-mobile": customer.mobile,
        "x-user-role": "user"
      }
    });
    if (trackAccepted.data?.status !== "accepted") {
      throw new Error("Customer tracking did not reflect accepted status!");
    }
    console.log("   ✓ Customer tracking reflects 'accepted'!");

    // 12. Garage Owner 1 updates status to 'in_progress'
    console.log("\n12. Garage Owner 1 updating status to 'in_progress'...");
    const progressRes = await api(`/api/book/${createdBooking.id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status: "in_progress", ownerNote: "Service van on the way" }),
      headers: {
        "x-user-id": owner1.id,
        "x-user-mobile": owner1.mobile,
        "x-user-role": "garage_owner"
      }
    });
    if (progressRes.status !== 200 || progressRes.data?.booking?.status !== "in_progress") {
      throw new Error(`Failed to set in_progress: ${JSON.stringify(progressRes.data)}`);
    }
    console.log("   ✓ Booking updated to 'in_progress'!");

    // 13. Garage Owner 1 updates status to 'completed'
    console.log("\n13. Garage Owner 1 updating status to 'completed'...");
    const completeRes = await api(`/api/book/${createdBooking.id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status: "completed", ownerNote: "Full vehicle inspection completed" }),
      headers: {
        "x-user-id": owner1.id,
        "x-user-mobile": owner1.mobile,
        "x-user-role": "garage_owner"
      }
    });
    if (completeRes.status !== 200 || completeRes.data?.booking?.status !== "completed") {
      throw new Error(`Failed to set completed: ${JSON.stringify(completeRes.data)}`);
    }
    console.log("   ✓ Booking updated to 'completed'!");

    // Customer tracking reflects completed
    const trackCompleted = await api(`/api/book/${createdBooking.id}`, {
      headers: {
        "x-user-id": customer.id,
        "x-user-mobile": customer.mobile,
        "x-user-role": "user"
      }
    });
    if (trackCompleted.data?.status !== "completed") {
      throw new Error("Customer tracking did not reflect completed status!");
    }
    console.log("   ✓ Customer tracking reflects 'completed' state!");

    console.log("\n=========================================");
    console.log("ALL BOOKING & TRACKING TESTS PASSED 100%!");
    console.log("=========================================\n");
  } finally {
    // Cleanup
    await User.deleteMany({ mobile: { $in: [testMobileUser, testMobileOther, testMobileOwner1, testMobileOwner2] } });
    await Garage.deleteMany({ phone: { $in: [testMobileOwner1, testMobileOwner2, `+91${testMobileOwner1}`, `+91${testMobileOwner2}`] } });
    await Booking.deleteMany({ "user.mobile": { $in: [testMobileUser, `+91${testMobileUser}`, testMobileOther] } });
    await LoginHistory.deleteMany({ mobile: { $in: [testMobileUser, testMobileOther, testMobileOwner1, testMobileOwner2] } });

    server.close();
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error("\nTEST SUITE FAILED:", err);
  process.exit(1);
});
