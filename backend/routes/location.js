const express = require("express");
const {
  getMapConfig,
  getRouteDirections,
  reverseGeocode
} = require("../controllers/locationController");

const router = express.Router();

router.get("/reverse", reverseGeocode);
router.get("/config", getMapConfig);
router.get("/route", getRouteDirections);

module.exports = router;
