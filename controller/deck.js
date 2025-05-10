const Deck = require('../models/deck');
const Dictionary = require('../models/wordModel');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const createResponse = require("../dto");

// Get current user's decks only
exports.getAllDecks = async (req, res) => {
  try {
    console.log(req.user)
    if (!req.user || !req.user.userId) {
      return res.status(401).json(createResponse(false, 'Authentication required'));
    }
    
    const decks = await Deck.find({ owner: req.user.userId })
      .populate({
        path: 'cards',
        select: 'word pronunciations meanings.part_of_speech.type'
      })
      .sort({ createdAt: -1 });
    
    res.status(200).json(createResponse(true, 'Decks retrieved successfully', { count: decks.length, data: decks }));
  } catch (error) {
    res.status(500).json(createResponse(false, error.message));
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
      return res.status(404).json(createResponse(false, 'Deck not found'));
    }
    
    if (req.user && req.user.userId && deck.owner !== req.user.userId) {
      return res.status(403).json(createResponse(false, 'Not authorized to access this deck'));
    }
    
    res.status(200).json(createResponse(true, 'Deck retrieved successfully', deck));
  } catch (error) {
    res.status(500).json(createResponse(false, error.message));
  }
};

// Create new deck with current user as owner
exports.createDeck = async (req, res) => {
  try {
    const { title, description } = req.body;
    console.log('Request body:', req.body);
    
    // Handle arrays from form data
    let cards = req.body.cards || [];
    let tags = req.body.tags || [];
    
    // Convert to array if needed
    if (!Array.isArray(cards)) {
      cards = [cards].filter(Boolean);
    }
    
    if (!Array.isArray(tags)) {
      tags = [tags].filter(Boolean);
    }
    
    console.log('Processed deck data:', { title, description, tags, cards });
    
    if (!req.user || !req.user.userId) {
      return res.status(401).json(createResponse(false, 'Authentication required to create a deck'));
    }
    
    if (cards && cards.length > 0) {
      const validCardIds = cards.every(id => ObjectId.isValid(id));
      if (!validCardIds) {
        return res.status(400).json(createResponse(false, 'Invalid card ID format'));
      }
      
      const cardCount = await Dictionary.countDocuments({
        _id: { $in: cards }
      });
      
      if (cardCount !== cards.length) {
        return res.status(400).json(createResponse(false, 'One or more cards do not exist'));
      }
    }

    if (tags && tags.length > 0) {
      const validTags = ['travel', 'technology', 'health', 'idioms', 'slang', 'food', 'tech', 'culture', 'history'];
      const invalidTags = tags.filter(tag => !validTags.includes(tag));
      
      if (invalidTags.length > 0) {
        return res.status(400).json(createResponse(false, `Invalid tags: ${invalidTags.join(', ')}`));
      }
    }
    
    // Use image URL from Cloudinary if an image was uploaded
    const img = req.uploadedFile ? req.uploadedFile.secure_url : req.body.img;
    
    const deck = await Deck.create({
      title,
      description,
      img,
      tags,
      cards,
      owner: req.user.userId
    });
    
    res.status(201).json(createResponse(true, 'Deck created successfully', deck));
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json(createResponse(false, messages));
    }
    res.status(500).json(createResponse(false, error.message));
  }
};

// Update deck (with owner verification)
exports.updateDeck = async (req, res) => {
  try {
    const { title, description } = req.body;
    const updateData = {};
    
    // Handle arrays from form data
    let cards = req.body.cards;
    let tags = req.body.tags;
    
    // Process cards array if provided
    if (cards !== undefined) {
      if (!Array.isArray(cards)) {
        cards = [cards].filter(Boolean);
      }
      
      if (cards.length > 0) {
        const validCardIds = cards.every(id => ObjectId.isValid(id));
        if (!validCardIds) {
          return res.status(400).json(createResponse(false, 'Invalid card ID format'));
        }
        
        const cardCount = await Dictionary.countDocuments({
          _id: { $in: cards }
        });
        
        if (cardCount !== cards.length) {
          return res.status(400).json(createResponse(false, 'One or more cards do not exist'));
        }
      }
      updateData.cards = cards;
    }
    
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    
    // Use image URL from Cloudinary if an image was uploaded
    if (req.uploadedFile) {
      updateData.img = req.uploadedFile.secure_url;
    } else if (req.body.img !== undefined) {
      updateData.img = req.body.img;
    }
    
    // Process tags array if provided
    if (tags !== undefined) {
      if (!Array.isArray(tags)) {
        tags = [tags].filter(Boolean);
      }
      
      if (tags.length > 0) {
        const validTags = ['travel', 'technology', 'health', 'idioms', 'slang', 'food', 'tech', 'culture', 'history'];
        const invalidTags = tags.filter(tag => !validTags.includes(tag));
        
        if (invalidTags.length > 0) {
          return res.status(400).json(createResponse(false, `Invalid tags: ${invalidTags.join(', ')}`));
        }
      }
      updateData.tags = tags;
    }
    
    const deck = await Deck.findById(req.params.id);
    if (!deck) {
      return res.status(404).json(createResponse(false, 'Deck not found'));
    }
    
    if (!req.user || !req.user.userId) {
      return res.status(401).json(createResponse(false, 'Authentication required'));
    }
    
    if (deck.owner !== req.user.userId) {
      return res.status(403).json(createResponse(false, 'Not authorized to update this deck'));
    }
    
    const updatedDeck = await Deck.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate({
      path: 'cards',
      select: 'word pronunciations meanings.part_of_speech.type'
    });
    
    res.status(200).json(createResponse(true, 'Deck updated successfully', updatedDeck));
  } catch (error) {
    res.status(500).json(createResponse(false, error.message));
  }
};

// Delete deck (with owner verification)
exports.deleteDeck = async (req, res) => {
  try {
    const deck = await Deck.findById(req.params.id);
    
    if (!deck) {
      return res.status(404).json(createResponse(false, 'Deck not found'));
    }
    
    if (!req.user || !req.user.userId) {
      return res.status(401).json(createResponse(false, 'Authentication required'));
    }
    
    if (deck.owner !== req.user.userId) {
      return res.status(403).json(createResponse(false, 'Not authorized to delete this deck'));
    }
    
    await deck.deleteOne();
    
    res.status(200).json(createResponse(true, 'Deck deleted successfully'));
  } catch (error) {
    res.status(500).json(createResponse(false, error.message));
  }
};

// Add card to deck (with owner verification)
exports.addCardToDeck = async (req, res) => {
  try {
    const { cardId } = req.body;
    
    if (!ObjectId.isValid(cardId)) {
      return res.status(400).json(createResponse(false, 'Invalid card ID format'));
    }
    
    const card = await Dictionary.findById(cardId);
    if (!card) {
      return res.status(404).json(createResponse(false, 'Card not found'));
    }
    
    const deck = await Deck.findById(req.params.id);
    if (!deck) {
      return res.status(404).json(createResponse(false, 'Deck not found'));
    }
    
    if (!req.user || !req.user.userId) {
      return res.status(401).json(createResponse(false, 'Authentication required'));
    }
    
    if (deck.owner !== req.user.userId) {
      return res.status(403).json(createResponse(false, 'Not authorized to modify this deck'));
    }
    
    if (deck.cards.includes(cardId)) {
      return res.status(400).json(createResponse(false, 'Card already exists in this deck'));
    }
    
    deck.cards.push(cardId);
    await deck.save();
    
    const updatedDeck = await Deck.findById(req.params.id).populate({
      path: 'cards',
      select: 'word pronunciations meanings.part_of_speech.type'
    });
    
    res.status(200).json(createResponse(true, 'Card added to deck successfully', updatedDeck));
  } catch (error) {
    res.status(500).json(createResponse(false, error.message));
  }
};

// Remove card from deck (with owner verification)
exports.removeCardFromDeck = async (req, res) => {
  try {
    const { cardId } = req.params;
    
    if (!ObjectId.isValid(cardId)) {
      return res.status(400).json(createResponse(false, 'Invalid card ID format'));
    }
    
    const deck = await Deck.findById(req.params.id);
    if (!deck) {
      return res.status(404).json(createResponse(false, 'Deck not found'));
    }
    
    if (!req.user || !req.user.userId) {
      return res.status(401).json(createResponse(false, 'Authentication required'));
    }
    
    if (deck.owner !== req.user.userId) {
      return res.status(403).json(createResponse(false, 'Not authorized to modify this deck'));
    }
    
    const cardIndex = deck.cards.indexOf(cardId);
    if (cardIndex === -1) {
      return res.status(404).json(createResponse(false, 'Card not found in this deck'));
    }
    
    deck.cards.splice(cardIndex, 1);
    await deck.save();
    
    const updatedDeck = await Deck.findById(req.params.id).populate({
      path: 'cards',
      select: 'word pronunciations meanings.part_of_speech.type'
    });
    
    res.status(200).json(createResponse(true, 'Card removed from deck successfully', updatedDeck));
  } catch (error) {
    res.status(500).json(createResponse(false, error.message));
  }
};