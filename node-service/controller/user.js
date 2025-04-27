const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const env = require('dotenv').config();
const response = require("../dto");
const { OAuth2Client } = require('google-auth-library');



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

    const { username, email, password } = req.body;

    let user = await User.findOne({ email });
    let passwordHash = null;
    if (user) {
      // If already has local auth, return error
      if (user.authProvider.includes('local')) {
        console.log("⚠️ Email already exists with password auth:", email);
        return res.status(400).json(response(false, "Email already exists with password authentication"));
      }
      
      // If has Google auth but no local auth, prompt to add password instead
      if (user.authProvider.includes('google') && !user.authProvider.includes('local')) {
        console.log("⚠️ User exists with Google auth only:", email);
        const salt = await bcrypt.genSalt(10);
        passwordHash = await bcrypt.hash(password, salt);
        user.passwordHash = passwordHash;
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "7d" });
        return res.status(200).json(response(true, "Sign up successful", {token, userId: user._id, username: user.username}));
      }
    }
      if (!password) {
        console.log("⚠️ Password is missing for local auth.");
        return res.status(400).json(response(false,"Password is required for email registration"));
      }

      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(password, salt);
      console.log("🔹 Generated hashed password:", passwordHash);

    // Generate a verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    console.log("🔹 Generated verification token:", verificationToken);

    // Create user object
    user = new User({
      username,
      email,
      passwordHash,
      verificationToken,
      avatar: null,
      isVerified: false, 
      authProvider: "local",
    });

    console.log("📝 User object before saving:", user);

    await user.save();

    // Send verification email for local users
    await sendVerificationEmail(user);

    console.log("✅ User registered successfully.");
    res.status(201).json(response(true, 
      "Register successfully, Please check your email for verification"));
  } catch (error) {
    console.error("❌ Error registering user:", error.message);
    res.status(500).json(response(false, error.message));
  }
};
// Login User
exports.loginUser = async (req, res) => {
  try {
    const { email, password, googleId } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json(response(false, "Invalid Credentials"));

    // Prevent login if not verified
    if (!user.isVerified) {
      return res.status(403).json(response(false, "Please verify before signing in"));
    }

    if (user.authProvider.includes('local')) {
      if (!password) return res.status(400).json(response, "Please enter password");

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) return res.status(400).json(response(false, "Wrong Password"));
    }

    if (user.authProvider.includes('google')) {
      return res.status(400).json(response(false, "sign up with password or sign in with google"));
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "7d" });

    res.json(response(true, "Login Successfully",{ token, userId: user._id, username: user.username }));
  } catch (error) {
    res.status(500).json(response(false, error.message));
  }
};

// Get User Profile (Protected Route)
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-passwordHash");
    if (!user) {
      return res.status(404).json(response(false, "User not found"));
    }
    res.json(response(true, "User Found!", user));
  } catch (error) {
    res.status(500).json(response(false, error.message));
  }
};

// Update User Profile
exports.updateUserProfile = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) return res.status(404).json(response(false, "User not found"));

    // Update username if provided
    if (username) user.username = username;

    // Update password if provided
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(password, salt);
    }

    await user.save();
    res.json(response(true, "Profile updated successfully", user));
  } catch (error) {
    res.status(500).json(response(false, error.message));
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
    if (!user) return res.status(404).json(response(false, "User not found"));

    if (user.isVerified) return res.status(400).json(response(false, "Email already verified"));

    // Generate a new verification token if needed
    user.verificationToken = crypto.randomBytes(32).toString("hex");
    await user.save();

    await sendVerificationEmail(user);

    res.json(response(true, "Verification Sent!"));
  } catch (error) {
    res.status(500).json(response(true, error.message));
  }
};

// Verify Email
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json(response(false, "Missing Token"));
    }

    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      return res.status(400).json(response(false, "Invalid or expired Token"));
    }

    user.isVerified = true;
    user.verificationToken = null; // Clear token after verification
    await user.save();

    res.json(response(true, "Email verified successfully. You can now log in."));
  } catch (error) {
    res.status(500).json(response(false, error.message));
  }
};

// Forgot Password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json(response(false, "User not found"));
    }

    // Generate reset token (valid for 15 minutes)
    const resetToken = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "15m" });

    const resetLink = `${BASE_URL}/redirect/reset?token=${resetToken}`;
    
    await transporter.sendMail({
      to: user.email,
      subject: "Password Reset Request",
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; background-color: #f9f9f9;">
          <div style="max-width: 500px; margin: auto; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #333; margin-bottom: 10px;">Reset Your Password</h2>
            <p style="color: #555; font-size: 16px;">Click the link below to reset your password:</p>
            <p style="font-size: 16px; word-wrap: break-word;">
              <a href="${resetLink}" style="color: #007bff; text-decoration: underline;">
                ${resetLink}
              </a>
            </p>
            <p style="color: #777; margin-top: 20px; font-size: 14px;">Or copy and paste this link into your browser:</p>
            <p style="word-break: break-word; font-size: 14px; color: #555;">${resetLink}</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
            <p style="color: #888; font-size: 12px;">This link is valid for 15 minutes.</p>
            <p style="color: #888; font-size: 12px;">If you didn't request this, please ignore this email.</p>
          </div>
        </div>
      `,
    });

    res.json(response(true, "Link sent!"));
  } catch (error) {
    res.status(500).json(response(false, error.message));
  }
};

exports.validateResetToken = async (req, res) => {
  try {
    const { token } = req.query;
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json(response(true, "Valid Token", decoded.userId));
  } catch (error) {
    res.status(400).json(response(false, "Invalid or Expired Token"));
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token) {
      return res.status(400).json(response(false, "Missing Token"));
    }

    if (!newPassword) {
      return res.redirect(`lacquer://reset?token=${encodeURIComponent(token)}`);
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(400).json(response(false, "Invalid Token or User not found"));
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    
    await user.save();
    
    res.json(response(true, "Password Changed!"));
  } catch (error) {
    res.status(400).json(response(false, error.message));
  }
};
exports.sendTokenToClient= async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json(response(false, "Missing Token"));
    }
    else return res.redirect(`lacquer://reset?token=${encodeURIComponent(token)}`);
  }
  catch(e){
    return res.status(400).json(response(false, e));
  }
};

// Google Sign-In for Mobile
exports.handleGoogleAuth = async (req, res) => {
  try {
    const { idToken } = req.body;
    
    if (!idToken) {
      return res.status(400).json(response(false, "Google ID token is required"));
    }

    // Verify the Google ID token
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    
    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    
    // Extract user information from the verified token
    const { email, name, picture, sub: googleId } = payload;
    
    // Check if user exists with this email
    let user = await User.findOne({ email });
    
    if (user) {
      // If user exists but authenticated via local method before
      if (user.authProvider === "local") {
        // Update user record to link Google account
        user.googleId = googleId;
        user.authProvider = "google";
        // Only update avatar if it's null
        if (!user.avatar) {
          user.avatar = picture;
        }
        user.isVerified = true; // Google verifies emails
        await user.save();
      } else if (user.authProvider === "google" && user.googleId !== googleId) {
        // Update googleId if it changed
        user.googleId = googleId;
        await user.save();
      }
    } else {
      // Create new user with Google authentication
      user = new User({
        username: name,
        email,
        googleId,
        authProvider: "google",
        avatar: picture,
        isVerified: true,
      });
      
      await user.save();
    }
    
    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "7d" });
    
    // Return user data and token
    return res.json(response(true, "Google authentication successful", { 
      token, 
      userId: user._id, 
      username: user.username,
      email: user.email,
      avatar: user.avatar 
    }));
    
  } catch (error) {
    console.error("❌ Google authentication error:", error);
    return res.status(500).json(response(false, "Google authentication failed: " + error.message));
  }
};

// Google OAuth callback handler (used in web flows, but included for completeness)
exports.googleAuthCallback = (req, res) => {
  passport.authenticate('google', { session: false }, (err, data) => {
    if (err || !data) {
      return res.redirect(`${process.env.MOBILE_APP_SCHEME}://auth/error?message=${encodeURIComponent('Authentication failed')}`);
    }
    
    const { user, token } = data;
    // Redirect to mobile app with token
    return res.redirect(`${process.env.MOBILE_APP_SCHEME}://auth/success?token=${token}&userId=${user._id}`);
  })(req, res);
};

const sendVerificationEmail = async (user) => {
  if (!user?.email || !user?.verificationToken) return;

  const verificationLink = `${BASE_URL}/redirect/verify?token=${user.verificationToken}`;

  await transporter.sendMail({
    to: user.email,
    subject: "Verify Your Email",
    html: `
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; background-color: #f9f9f9;">
        <div style="max-width: 500px; margin: auto; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);">
          <h2 style="color: #333; margin-bottom: 10px;">Verify Your Email</h2>
          <p style="color: #555; font-size: 16px;">Click the button below to verify your email:</p>
          <p>
            <a href="${verificationLink}" 
               style="display: inline-block; background-color: #007bff; color: #fff; padding: 10px 20px; font-size: 16px; 
                      text-decoration: none; border-radius: 5px; font-weight: bold;">
              Verify Email
            </a>
          </p>
          <p style="color: #777; margin-top: 20px; font-size: 14px;">Or copy and paste this link into your browser:</p>
          <p style="word-break: break-word; font-size: 14px; color: #555;">
            <a href="${verificationLink}" style="color: #007bff; text-decoration: underline;">
              ${verificationLink}
            </a>
          </p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #888; font-size: 12px;">If you didn't request this, please ignore this email.</p>
        </div>
      </div>
    `,
  });
};