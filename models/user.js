const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: function () { return this.authProvider === "local"; } }, 
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, default: null }, 
    avatar: { type: String, default: null }, 
    
    // Authentication provider tracking
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
    googleId: { type: String, default: null },
    
    // Email verification
    isVerified: { type: Boolean, default: function () { return this.authProvider !== "local"; } }, 
    verificationToken: { type: String, default: null },
    badges: [{ type: mongoose.Schema.Types.ObjectId, ref: "Badge" }],
    friendships: [{ type: mongoose.Schema.Types.ObjectId, ref: "Friendship" }]
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);