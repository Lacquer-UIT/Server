const mongoose = require('mongoose');

const TagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true, // no duplicate tags
    lowercase: true,
    trim: true,
  },
  description: {
    type: String,
  }
}, { timestamps: true });

module.exports = mongoose.model('Tag', TagSchema);