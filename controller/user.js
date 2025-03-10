const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

// JWT Secret (should be in .env)
const JWT_SECRET = process.env.JWT_SECRET;
const BASE_URL = process.env.BASE_URL; 

// Email Transporter 
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

// Register User & Send Verification Email
exports.registerUser = async (req, res) => {
    try {
      console.log("🔹 Received register request:", req.body);
  
      const { username, email, password, authProvider, googleId } = req.body;
  
      let user = await User.findOne({ email });
      if (user) {
        console.log("⚠️ Email already exists:", email);
        return res.status(400).json({ message: "Email already exists" });
      }
  
      let passwordHash = null;
      if (authProvider === "local") {
        if (!password) {
          console.log("⚠️ Password is missing for local auth.");
          return res.status(400).json({ message: "Password is required" });
        }
  
        const salt = await bcrypt.genSalt(10);
        passwordHash = await bcrypt.hash(password, salt);
        console.log("🔹 Generated hashed password:", passwordHash);
      }
  
      // Generate a verification token
      const verificationToken = crypto.randomBytes(32).toString("hex");
      console.log("🔹 Generated verification token:", verificationToken);
  
      // Create user object
      user = new User({
        username,
        email,
        passwordHash,
        authProvider,
        googleId: authProvider === "google" ? googleId : null,
        verificationToken,
        isVerified: authProvider === "google", // Google users are auto-verified
      });
  
      console.log("📝 User object before saving:", user);
  
      await user.save();
  
      // Send verification email for local users
      if (authProvider === "local") {
        console.log("📧 Sending verification email...");
        await sendVerificationEmail(user);
        console.log("✅ Verification email sent!");
      }
  
      console.log("✅ User registered successfully.");
      res.status(201).json({ message: "User registered successfully. Please verify your email." });
    } catch (error) {
      console.error("❌ Error registering user:", error.message);
      res.status(500).json({ message: error.message });
    }
  };
// Login User
exports.loginUser = async (req, res) => {
    try {
      const { email, password, googleId } = req.body;
  
      const user = await User.findOne({ email });
      if (!user) return res.status(400).json({ message: "Invalid credentials" });
  
      // Prevent login if not verified
      if (!user.isVerified) {
        return res.status(403).json({ message: "Please verify your email before logging in." });
      }
  
      if (user.authProvider === "local") {
        if (!password) return res.status(400).json({ message: "Password is required" });
  
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });
      }
  
      if (user.authProvider === "google" && googleId !== user.googleId) {
        return res.status(400).json({ message: "Invalid Google authentication" });
      }
  
      const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "7d" });
  
      res.json({ token, userId: user._id, username: user.username });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };

// Get User Profile (Protected Route)
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-passwordHash");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update User Profile
exports.updateUserProfile = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) return res.status(404).json({ message: "User not found" });

    // Update username if provided
    if (username) user.username = username;

    // Update password if provided
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(password, salt);
    }

    await user.save();
    res.json({ message: "Profile updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete User Account
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await User.findByIdAndDelete(req.user.userId);
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Resend Verification Email
exports.resendVerificationEmail = async (req, res) => {
    try {
      const { email } = req.body;
  
      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ message: "User not found" });
  
      if (user.isVerified) return res.status(400).json({ message: "Email is already verified" });
  
      // Generate a new verification token if needed
      user.verificationToken = crypto.randomBytes(32).toString("hex");
      await user.save();
  
      await sendVerificationEmail(user);
  
      res.json({ message: "Verification email resent successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };

// Verify Email
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    user.isVerified = true;
    user.verificationToken = null; // Clear token after verification
    await user.save();

    res.json({ message: "Email verified successfully. You can now log in." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const sendVerificationEmail = async (user) => {
    if (!user || !user.email || !user.verificationToken) return;
  
    const verificationLink = `${BASE_URL}/auth/verify?token=${user.verificationToken}`;
  
    await transporter.sendMail({
      to: user.email,
      subject: "Verify Your Email",
      text: `Click this link to verify your email: ${verificationLink}`,
    });
  };