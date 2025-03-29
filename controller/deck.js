const Deck = require('../models/deck');
const Dictionary = require('../models/wordModel');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

// Get current user's decks only
exports.getAllDecks = async (req, res) => {
  try {
    // Ensure user is authenticated and use their ID as the owner filter
    console.log(req.user)
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    const decks = await Deck.find({ owner: req.user.userId })
      .populate({
        path: 'cards',
        select: 'word pronunciations meanings.part_of_speech.type'
      })
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: decks.length,
      data: decks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get single deck by ID (with owner verification)
exports.getDeckById = async (req, res) => {
  try {
    const deck = await Deck.findById(req.params.id)
      .populate({
        path: 'cards',
        select: 'word pronunciations meanings img'
      });
    
    if (!deck) {
      return res.status(404).json({
        success: false,
        error: 'Deck not found'
      });
    }
    
    // Verify ownership if user is authenticated
    if (req.user && req.user.userId && deck.owner !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this deck'
      });
    }
    
    res.status(200).json({
      success: true,
      data: deck
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Create new deck with current user as owner
exports.createDeck = async (req, res) => {
  try {
    const { title, description, img, cards } = req.body;
    
    // Ensure user is authenticated
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required to create a deck'
      });
    }
    
    // Validate card IDs if provided
    if (cards && cards.length > 0) {
      const validCardIds = cards.every(id => ObjectId.isValid(id));
      if (!validCardIds) {
        return res.status(400).json({
          success: false,
          error: 'Invalid card ID format'
        });
      }
      
      // Check if all cards exist in Dictionary
      const cardCount = await Dictionary.countDocuments({
        _id: { $in: cards }
      });
      
      if (cardCount !== cards.length) {
        return res.status(400).json({
          success: false,
          error: 'One or more cards do not exist'
        });
      }
    }
    
    // Always set the owner to the current user's ID
    const deck = await Deck.create({
      title,
      description,
      img,
      cards: cards || [],
      owner: req.user.userId
    });
    
    res.status(201).json({
      success: true,
      data: deck
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        error: messages
      });
    }
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update deck (with owner verification)
exports.updateDeck = async (req, res) => {
  try {
    const { title, description, img, cards } = req.body;
    const updateData = {};
    
    // Only include fields that were provided
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (img !== undefined) updateData.img = img;
    
    // Validate cards if provided
    if (cards !== undefined) {
      if (cards.length > 0) {
        const validCardIds = cards.every(id => ObjectId.isValid(id));
        if (!validCardIds) {
          return res.status(400).json({
            success: false,
            error: 'Invalid card ID format'
          });
        }
        
        // Check if all cards exist
        const cardCount = await Dictionary.countDocuments({
          _id: { $in: cards }
        });
        
        if (cardCount !== cards.length) {
          return res.status(400).json({
            success: false,
            error: 'One or more cards do not exist'
          });
        }
      }
      updateData.cards = cards;
    }
    
    // Find deck
    const deck = await Deck.findById(req.params.id);
    if (!deck) {
      return res.status(404).json({
        success: false,
        error: 'Deck not found'
      });
    }
    
    // Ensure user is authenticated and is the owner
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    if (deck.owner !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this deck'
      });
    }
    
    // Update the deck
    const updatedDeck = await Deck.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate({
      path: 'cards',
      select: 'word pronunciations meanings.part_of_speech.type'
    });
    
    res.status(200).json({
      success: true,
      data: updatedDeck
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Delete deck (with owner verification)
exports.deleteDeck = async (req, res) => {
  try {
    const deck = await Deck.findById(req.params.id);
    
    if (!deck) {
      return res.status(404).json({
        success: false,
        error: 'Deck not found'
      });
    }
    
    // Ensure user is authenticated and is the owner
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    if (deck.owner !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this deck'
      });
    }
    
    await deck.deleteOne();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Add card to deck (with owner verification)
exports.addCardToDeck = async (req, res) => {
  try {
    const { cardId } = req.body;
    
    if (!ObjectId.isValid(cardId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid card ID format'
      });
    }
    
    // Check if card exists
    const card = await Dictionary.findById(cardId);
    if (!card) {
      return res.status(404).json({
        success: false,
        error: 'Card not found'
      });
    }
    
    // Find deck
    const deck = await Deck.findById(req.params.id);
    if (!deck) {
      return res.status(404).json({
        success: false,
        error: 'Deck not found'
      });
    }
    
    // Ensure user is authenticated and is the owner
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    if (deck.owner !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to modify this deck'
      });
    }
    
    // Check if card is already in the deck
    if (deck.cards.includes(cardId)) {
      return res.status(400).json({
        success: false,
        error: 'Card already exists in this deck'
      });
    }
    
    // Add card to deck
    deck.cards.push(cardId);
    await deck.save();
    
    // Return updated deck with populated cards
    const updatedDeck = await Deck.findById(req.params.id).populate({
      path: 'cards',
      select: 'word pronunciations meanings.part_of_speech.type'
    });
    
    res.status(200).json({
      success: true,
      data: updatedDeck
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Remove card from deck (with owner verification)
exports.removeCardFromDeck = async (req, res) => {
  try {
    const { cardId } = req.params;
    
    if (!ObjectId.isValid(cardId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid card ID format'
      });
    }
    
    // Find deck
    const deck = await Deck.findById(req.params.id);
    if (!deck) {
      return res.status(404).json({
        success: false,
        error: 'Deck not found'
      });
    }
    
    // Ensure user is authenticated and is the owner
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    if (deck.owner !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to modify this deck'
      });
    }
    
    // Check if card exists in deck
    const cardIndex = deck.cards.indexOf(cardId);
    if (cardIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Card not found in this deck'
      });
    }
    
    // Remove card from deck
    deck.cards.splice(cardIndex, 1);
    await deck.save();
    
    // Return updated deck with populated cards
    const updatedDeck = await Deck.findById(req.params.id).populate({
      path: 'cards',
      select: 'word pronunciations meanings.part_of_speech.type'
    });
    
    res.status(200).json({
      success: true,
      data: updatedDeck
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};