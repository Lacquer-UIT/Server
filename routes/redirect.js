const express = require("express");
var router = express.Router();

const {
    verifyEmail,
    resetPassword,
  } = require("../controller/user");

router.get("/verify", verifyEmail);
router.get("/reset", resetPassword);

module.exports = router