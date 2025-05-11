const mongoose = require('mongoose');

const chatbotSchema = new mongoose.Schema({
    userId: {type: String, required: true},
    history: [
        {
            role: {type: String, enum: ['user', 'model'], required: true},
            parts: [
                {
                    text: {type: String, required: true},                }
            ]
        }
    ],
  }, { timestamps: true });
  
  module.exports = mongoose.model("Chatbothistory", chatbotSchema);