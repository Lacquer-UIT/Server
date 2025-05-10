const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, default: null },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // for "seen" tracking
  }, { timestamps: true });
  
  module.exports = mongoose.model("Message", messageSchema);