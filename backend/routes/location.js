const express = require("express");
const { reverseGeocode } = require("../controllers/locationController");

const router = express.Router();

router.get("/reverse", reverseGeocode);

module.exports = router;
