/**
 * Central API route registry.
 *
 * server.js imports one router table instead of knowing every feature file.
 */
module.exports = [
  { path: "/api/admin", router: require("./admin") },
  { path: "/api/auth", router: require("./auth") },
  { path: "/api/book", router: require("./booking") },
  { path: "/api/bookings", router: require("./booking") },
  { path: "/api/garage", router: require("./garage") },
  { path: "/api/garages", router: require("./garage") },
  { path: "/api/login", router: require("./login") },
  { path: "/api/location", router: require("./location") },
  { path: "/api/pincode", router: require("./pincode") },
  { path: "/api/service", router: require("./service") },
  { path: "/api/services", router: require("./service") }
];
