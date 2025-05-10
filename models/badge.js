const mongoose = require('mongoose');  

const badgeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    iconUrl: { type: String, required: true },
  }, { timestamps: true });
  
  module.exports = mongoose.model("Badge", badgeSchema);