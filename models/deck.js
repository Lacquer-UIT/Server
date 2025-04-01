const mongoose = require('mongoose');

const DeckSchema = new mongoose.Schema({
    owner: { 
        type: String,
        required: true 
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
    tags: [{
        type: String,
        enum: ['travel', 'technology', 'health', 'idioms', 'slang', 'food', 'tech', 'culture', 'history'],
        default: []
    }],
    cards: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Dictionary' 
    }]
}, { timestamps: true });

module.exports = mongoose.model('Deck', DeckSchema);