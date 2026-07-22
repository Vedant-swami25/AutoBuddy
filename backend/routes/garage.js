const express = require("express");
const {
  addGarage,
  getGarageById,
  listGarages
} = require("../controllers/garageController");

const router = express.Router();

router.get("/", listGarages);
router.post("/add", addGarage);
router.get("/:id", getGarageById);

module.exports = router;
