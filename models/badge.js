const mongoose = require('mongoose');  

const badgeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    iconUrl: String,
  }, { timestamps: true });
  
  module.exports = mongoose.model("Badge", badgeSchema);