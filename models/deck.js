const mongoose = require('mongoose');

const DeckSchema = new mongoose.Schema({
    owner: { 
        type: String,
        required: false 
    },
    title: { 
        type: String, 
        required: true 
    },
    description: { 
        type: String 
    },
    img: { 
        type: String 
    },
    isDone:{
        type: Boolean,
        default: false
    },
    tags: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tag'
      }],
    cards: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Dictionary' 
    }]
}, { timestamps: true });

module.exports = mongoose.model('Deck', DeckSchema);