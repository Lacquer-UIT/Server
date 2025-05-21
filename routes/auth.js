const express = require('express');
const router = express.Router();
require("dotenv").config();
const jwt = require("jsonwebtoken");
const { upload, handleUpload } = require('../middleware/upload');
const verifyRecaptcha = require('../middleware/recaptcha');

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
    getQRCode,
    updateAbout
  } = require("../controller/user");
  const authMiddleware = require("../middleware/auth");

// Public routes
router.post("/register", verifyRecaptcha, registerUser);
router.post("/login", verifyRecaptcha, loginUser);
router.get("/verify", verifyEmail);
router.post("/resend", verifyRecaptcha, resendVerificationEmail)
router.post("/forgot", forgotPassword);

// Protected routes (require JWT token)
router.get("/profile", authMiddleware, getUserProfile);
router.put("/profile", authMiddleware, updateUserProfile);
router.delete("/delete", authMiddleware, deleteUser);
router.put("/avatar", authMiddleware, upload.single('avatar'), handleUpload, updateAvatar);
router.get("/qrcode", authMiddleware, getQRCode);
router.put("/about", authMiddleware, updateAbout);

// Google OAuth routes for mobile
router.post("/google", handleGoogleAuth);
router.get("/google/callback", googleAuthCallback); // unused in mobile, but can be used for web
router.get("/token", sendTokenToClient);

module.exports = router;