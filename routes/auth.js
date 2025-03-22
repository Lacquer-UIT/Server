const express = require('express');
const router = express.Router();
require("dotenv").config();
const passport = require("passport");
const jwt = require("jsonwebtoken");

const {
    registerUser,
    loginUser,
    getUserProfile,
    updateUserProfile,
    deleteUser,
    verifyEmail,
    resendVerificationEmail
  } = require("../controller/user");
  const authMiddleware = require("../middleware/auth");

// Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/verify", verifyEmail);
router.post("/resend", resendVerificationEmail);

// Protected routes (require JWT token)
router.get("/profile", authMiddleware, getUserProfile);
router.put("/profile", authMiddleware, updateUserProfile);
router.delete("/delete", authMiddleware, deleteUser);


// Google OAuth route
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

// Callback route
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Authentication failed" });

    // Send JWT token back to mobile app
    res.json({
      message: "Authentication successful",
      user: req.user.user,
      token: req.user.token,
    });
  }
);

// Logout route
router.get("/auth/logout", (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: "Logout failed" });
    res.redirect("/");
  });
});


module.exports = router;