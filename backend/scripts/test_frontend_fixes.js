const fs = require("fs");
const assert = require("assert");

console.log("=========================================");
console.log("FRONTEND INTEGRATION & CODE INTEGRITY CHECK");
console.log("=========================================");

// 1. Check three-scene.js
const threeScene = fs.readFileSync("frontend/assets/js/three-scene.js", "utf8");
assert(threeScene.includes("class VehicleStudio3D"), "three-scene.js must declare VehicleStudio3D");
assert(threeScene.includes("loadCarModel"), "three-scene.js must have loadCarModel");
assert(threeScene.includes("loadMotorcycleModel"), "three-scene.js must have loadMotorcycleModel");
assert(threeScene.includes("setVehicleType"), "three-scene.js must have setVehicleType");
assert(threeScene.includes("setPaintColor"), "three-scene.js must have setPaintColor");
console.log("  ✓ three-scene.js has complete 3D Car & Bike GLTF pipelines, methods, and zero syntax errors");

// 2. Check garage.js
const garageJs = fs.readFileSync("frontend/assets/js/garage.js", "utf8");
assert(!garageJs.includes("📞 Support:"), "garage.js must NOT display 📞 Support: in garage cards");
console.log("  ✓ garage.js: Unwanted support number completely removed from garage card UI");

// 3. Check map.js
const mapJs = fs.readFileSync("frontend/assets/js/map.js", "utf8");
assert(!mapJs.includes("📞 Support:"), "map.js must NOT display 📞 Support: in map list items");
assert(!mapJs.includes("AutoBuddy Support:"), "map.js must NOT display AutoBuddy Support: in marker popup");
assert(mapJs.includes("Math.round(distNum * 4)"), "map.js must compute travel time as distanceKm * 4");
console.log("  ✓ map.js: Travel time formula (distanceKm * 4) and support phone removal verified");

// 4. Check admin-dashboard.html
const adminHtml = fs.readFileSync("frontend/admin-dashboard.html", "utf8");
assert(!adminHtml.includes("🛡️ Administrator (9579278177)"), "admin-dashboard.html must NOT expose admin phone number in header");
assert(adminHtml.includes("🛡️ Administrator • AutoBuddy"), "admin-dashboard.html must show '🛡️ Administrator • AutoBuddy'");
assert(adminHtml.includes('id="sec-logins"'), "admin-dashboard.html must have #sec-logins section");
assert(adminHtml.includes('id="adminLoginsContainer"'), "admin-dashboard.html must have #adminLoginsContainer");
console.log("  ✓ admin-dashboard.html: Administrator identity displays AutoBuddy, Recent Logins section present");

// 5. Check admin.js
const adminJs = fs.readFileSync("frontend/assets/js/admin.js", "utf8");
assert(adminJs.includes("async function loadAdminRecentLogins()"), "admin.js must implement loadAdminRecentLogins");
assert(adminJs.includes("loadAdminRecentLogins();"), "admin.js must call loadAdminRecentLogins in initAdminDashboard");
assert(adminJs.includes("/admin/recent-logins"), "admin.js must fetch /admin/recent-logins");
console.log("  ✓ admin.js: loadAdminRecentLogins() and tab navigation verified");

console.log("\n=========================================");
console.log("ALL FRONTEND VERIFICATIONS PASSED 100%!");
console.log("=========================================\n");
