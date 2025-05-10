const mongoose = require('mongoose');

const friendshipSchema = new mongoose.Schema({
    requester: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["pending", "accepted", "blocked"], default: "pending" },
    blocker: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  }, { timestamps: true });
  
  module.exports = mongoose.model("Friendship", friendshipSchema);