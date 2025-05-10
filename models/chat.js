const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    isGroup: { type: Boolean, default: false },
    name: { type: String }, // only for group chats
    avatar: { type: String }, // group avatar maybe?
  
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
  
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // for group chat roles
  }, { timestamps: true });
  
  module.exports = mongoose.model("Chat", chatSchema);