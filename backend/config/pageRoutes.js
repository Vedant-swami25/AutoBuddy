/**
 * Maps clean browser URLs to static frontend pages.
 *
 * Keeping this table outside server.js makes route changes easy to review
 * while leaving the server entry point focused on startup wiring.
 */
const pageRoutes = {
  "/": "login.html",
  "/login": "login.html",
  "/home": "index.html",
  "/services": "services.html",
  "/garages": "garage.html",
  "/tracking": "tracking.html",
  "/partners": "partner.html",
  "/map": "map.html"
};

module.exports = { pageRoutes };
