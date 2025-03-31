const express = require("express");
var router = express.Router();

const {
    verifyEmail,
    resetPassword,
    sendTokenToClient
  } = require("../controller/user");

router.get("/verify", verifyEmail);
router.post("/reset", resetPassword);
router.get("/reset", sendTokenToClient)

module.exports = router