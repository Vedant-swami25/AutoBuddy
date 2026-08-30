const express = require("express");
const { authenticate, requireRole } = require("../middleware/auth");
const {
  addGarage,
  getGarageById,
  listGarages
} = require("../controllers/garageController");

const router = express.Router();

router.use(authenticate);

router.get("/", listGarages);
router.get("/:id", getGarageById);
router.post("/", requireRole("garage_owner", "admin"), addGarage);
router.post("/add", requireRole("garage_owner", "admin"), addGarage);

module.exports = router;
