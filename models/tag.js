const mongoose = require('mongoose');

const TagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true, // no duplicate tags
    lowercase: true,
    trim: true,
    enum: ['travel', 'technology', 'health', 'idioms', 'slang', 'food', 'tech', 'culture', 'history'] // optional constraint
  },
  description: {
    type: String,
  }
}, { timestamps: true });

module.exports = mongoose.model('Tag', TagSchema);