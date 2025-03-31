const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: function () { return this.authProvider === "local"; } }, 
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, default: null }, 
    avatar: { type: String, default: null }, 
    
    // Authentication provider tracking
    authProvider: { type: String, enum: ['local', 'google'], default: [] },
    googleId: { type: String, default: null },
    
    // Email verification
    isVerified: { type: Boolean, default: function () { return this.authProvider !== "local"; } }, 
    verificationToken: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);