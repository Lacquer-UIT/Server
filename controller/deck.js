const Deck = require('../models/deck');
const Dictionary = require('../models/wordModel');
const Tag = require('../models/tag');
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
      .populate('tags', 'name description')
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
      })
      .populate('tags', 'name description');
    
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
    console.log('Request file:', req.file);
    console.log('Uploaded file:', req.uploadedFile);
    
    // Handle arrays from form data
    let cards = req.body.cards || [];
    let tagNames = req.body.tags || [];
    console.log('Cards:', cards);
    console.log('Tag names:', tagNames);
    
    // Convert to array if needed
    if (!Array.isArray(cards)) {
      cards = [cards].filter(Boolean);
    }
    
    if (!Array.isArray(tagNames)) {
      tagNames = [tagNames].filter(Boolean);
    }
    
    console.log('Processed deck data:', { title, description, tagNames, cards });
    
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

    // Process tags
    let tags = [];
    if (tagNames && tagNames.length > 0) {
      // Get existing tags from database
      const existingTags = await Tag.find({ name: { $in: tagNames } });
      
      if (existingTags.length !== tagNames.length) {
        // Find which tags don't exist
        const existingTagNames = existingTags.map(tag => tag.name);
        const nonExistingTags = tagNames.filter(tag => !existingTagNames.includes(tag));
        
        return res.status(400).json(createResponse(false, 
          `Some tags don't exist: ${nonExistingTags.join(', ')}. Please create them first.`));
      }
      
      tags = existingTags.map(tag => tag._id);
    }
    
    // Use image URL from Cloudinary if an image was uploaded
    const image = req.uploadedFile ? req.uploadedFile.secure_url : req.body.image;
    
    const deck = await Deck.create({
      title,
      description,
      image,
      tags,
      cards,
      owner: req.user.userId
    });
    
    const populatedDeck = await Deck.findById(deck._id)
      .populate({
        path: 'cards',
        select: 'word pronunciations meanings.part_of_speech.type'
      })
      .populate('tags', 'name description');
    
    res.status(201).json(createResponse(true, 'Deck created successfully', populatedDeck));
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
    let tagNames = req.body.tags;
    
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
    if (tagNames !== undefined) {
      if (!Array.isArray(tagNames)) {
        tagNames = [tagNames].filter(Boolean);
      }
      
      if (tagNames.length > 0) {
        // Get existing tags from database
        const existingTags = await Tag.find({ name: { $in: tagNames } });
        
        if (existingTags.length !== tagNames.length) {
          // Find which tags don't exist
          const existingTagNames = existingTags.map(tag => tag.name);
          const nonExistingTags = tagNames.filter(tag => !existingTagNames.includes(tag));
          
          return res.status(400).json(createResponse(false, 
            `Some tags don't exist: ${nonExistingTags.join(', ')}. Please create them first.`));
        }
        
        updateData.tags = existingTags.map(tag => tag._id);
      } else {
        updateData.tags = [];
      }
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
    }).populate('tags', 'name description');
    
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