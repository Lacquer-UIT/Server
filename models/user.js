const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: function () { return this.authProvider === "local"; } }, // Required only for local users
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, default: null }, // Only local users need this
    authProvider: { type: String, enum: ["local", "google"], required: true },
    
    // Google OAuth fields
    googleId: { type: String, default: null },
    name: { type: String, default: null }, // For Google users
    avatar: { type: String, default: null }, // Store Google profile picture
    
    // Email verification
    isVerified: { type: Boolean, default: function () { return this.authProvider !== "local"; } }, // Google users are verified by default
    verificationToken: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);