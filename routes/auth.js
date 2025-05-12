const express = require('express');
const router = express.Router();
require("dotenv").config();
const jwt = require("jsonwebtoken");
const { upload, handleUpload } = require('../middleware/upload');

const {
    registerUser,
    loginUser,
    getUserProfile,
    updateUserProfile,
    deleteUser,
    verifyEmail,
    resendVerificationEmail,
    forgotPassword,
    handleGoogleAuth,
    googleAuthCallback,
    sendTokenToClient,
    updateAvatar,
    getQRCode
  } = require("../controller/user");
  const authMiddleware = require("../middleware/auth");

// Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/verify", verifyEmail);
router.post("/resend", resendVerificationEmail)
router.post("/forgot", forgotPassword);

// Protected routes (require JWT token)
router.get("/profile", authMiddleware, getUserProfile);
router.put("/profile", authMiddleware, updateUserProfile);
router.delete("/delete", authMiddleware, deleteUser);
router.put("/avatar", authMiddleware, upload.single('avatar'), handleUpload, updateAvatar);
router.get("/qrcode", authMiddleware, getQRCode);

// Google OAuth routes for mobile
router.post("/google", handleGoogleAuth);
router.get("/google/callback", googleAuthCallback); // unused in mobile, but can be used for web
router.get("/token", sendTokenToClient);

module.exports = router;