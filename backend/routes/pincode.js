const express = require("express");
const { lookupPincode } = require("../controllers/pincodeController");

const router = express.Router();

router.get("/:pincode", lookupPincode);

module.exports = router;
