const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const env = require('dotenv').config();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

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
    const { token } = req.body;
    console.log(token);

    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }
    console.log(user);

    user.isVerified = true;
    user.verificationToken = null; // Clear token after verification
    await user.save();

    res.json({ message: "Email verified successfully. You can now log in." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BASE_URL}/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        let user = await User.findOne({ email });

        if (user) {
          if (user.authProvider === "local") {
            // Convert local account to Google OAuth
            user.googleId = profile.id;
            user.authProvider = "google";
            user.avatar = profile.photos[0].value;
            user.isVerified = true; // Google verifies emails
            await user.save();
          }
        } else {
          // Create new Google user
          user = await User.create({
            googleId: profile.id,
            name: profile.displayName,
            email,
            authProvider: "google",
            avatar: profile.photos[0].value,
            isVerified: true, // Google users are always verified
          });
        }

        // Generate JWT token
        const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET, {
          expiresIn: "7d",
        });

        return done(null, { user, token });
      } catch (error) {
        return done(error, null);
      }
    }
  )
);
// Serialize & Deserialize user (for session handling)
passport.serializeUser((user, done) => {
done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
const user = await User.findById(id);
done(null, user);
});


const sendVerificationEmail = async (user) => {
  if (!user?.email || !user?.verificationToken) return;

  const verificationLink = `${BASE_URL}/verify?token=${user.verificationToken}`;

  await transporter.sendMail({
    to: user.email,
    subject: "Verify Your Email",
    html: `
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; background-color: #f9f9f9;">
        <div style="max-width: 500px; margin: auto; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);">
          <h2 style="color: #333; margin-bottom: 10px;">Verify Your Email</h2>
          <p style="color: #555; font-size: 16px;">Click the button below to verify your email address:</p>
          <a href="${verificationLink}" 
             style="display: inline-block; padding: 12px 20px; font-size: 16px; font-weight: bold;
                    color: #fff; background-color: #007bff; text-decoration: none; 
                    border-radius: 5px; margin-top: 10px;">
            Verify Email
          </a>
          <p style="color: #777; margin-top: 20px; font-size: 14px;">Or copy and paste this link into your browser:</p>
          <p style="word-break: break-word; font-size: 14px; color: #555;">${verificationLink}</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #888; font-size: 12px;">If you didn't request this, please ignore this email.</p>
        </div>
      </div>
    `,
  });
};