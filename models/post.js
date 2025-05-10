const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    imageUrl: { type: String, required: true },
    caption: { type: String, default: null },
    visibleTo: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  
    reactions: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      emoji: { type: String, required: true }
    }]
  }, { timestamps: true });

  module.exports = mongoose.model("Post", postSchema);