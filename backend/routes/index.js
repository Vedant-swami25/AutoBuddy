/**
 * Central API route registry.
 *
 * server.js imports one router table instead of knowing every feature file.
 */
module.exports = [
  { path: "/api/book", router: require("./booking") },
  { path: "/api/garage", router: require("./garage") },
  { path: "/api/login", router: require("./login") },
  { path: "/api/location", router: require("./location") },
  { path: "/api/pincode", router: require("./pincode") }
];
