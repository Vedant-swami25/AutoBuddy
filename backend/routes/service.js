const express = require("express");
const { listServices, getServiceById } = require("../controllers/serviceController");

const router = express.Router();

router.get("/", listServices);
router.get("/:id", getServiceById);

module.exports = router;
