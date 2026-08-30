const express = require("express");
const { authenticate, requireAdmin } = require("../middleware/auth");
const { listUsers, login } = require("../controllers/loginController");

const router = express.Router();

router.post("/", login);
router.get("/", authenticate, requireAdmin, listUsers);

module.exports = router;
