const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String },
    authProvider: { type: String, enum: ["local", "google"], required: true },
    googleId: { type: String, default: null }, // Ensure Google login users have a default null
    isVerified: { type: Boolean, default: false }, // Default false, only true after email verification
    verificationToken: { type: String, default: null }, // Default null if not needed
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);