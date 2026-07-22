const express = require("express");
const { listUsers, login } = require("../controllers/loginController");

const router = express.Router();

router.post("/", login);
router.get("/", listUsers);

module.exports = router;
