const Tag = require('../models/tag');
const createResponse = require('../dto');

// Get all tags
exports.getAllTags = async (req, res) => {
  try {
    const tags = await Tag.find().sort({ name: 1 });
    res.status(200).json(createResponse(true, 'Tags retrieved successfully', { count: tags.length, data: tags }));
  } catch (error) {
    res.status(500).json(createResponse(false, error.message));
  }
};

// Get tag by ID
exports.getTagById = async (req, res) => {
  try {
    const tag = await Tag.findById(req.params.id);
    
    if (!tag) {
      return res.status(404).json(createResponse(false, 'Tag not found'));
    }
    
    res.status(200).json(createResponse(true, 'Tag retrieved successfully', tag));
  } catch (error) {
    res.status(500).json(createResponse(false, error.message));
  }
};

// Create new tag
exports.createTag = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    // Check if tag already exists
    const existingTag = await Tag.findOne({ name: name.toLowerCase() });
    if (existingTag) {
      return res.status(400).json(createResponse(false, 'Tag already exists'));
    }
    
    const tag = await Tag.create({
      name,
      description
    });
    
    res.status(201).json(createResponse(true, 'Tag created successfully', tag));
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json(createResponse(false, messages));
    }
    res.status(500).json(createResponse(false, error.message));
  }
};

// Update tag
exports.updateTag = async (req, res) => {
  try {
    const { name, description } = req.body;
    const updateData = {};
    
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    
    const tag = await Tag.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!tag) {
      return res.status(404).json(createResponse(false, 'Tag not found'));
    }
    
    res.status(200).json(createResponse(true, 'Tag updated successfully', tag));
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json(createResponse(false, messages));
    }
    res.status(500).json(createResponse(false, error.message));
  }
};

// Delete tag
exports.deleteTag = async (req, res) => {
  try {
    const tag = await Tag.findById(req.params.id);
    
    if (!tag) {
      return res.status(404).json(createResponse(false, 'Tag not found'));
    }
    
    await tag.deleteOne();
    
    res.status(200).json(createResponse(true, 'Tag deleted successfully'));
  } catch (error) {
    res.status(500).json(createResponse(false, error.message));
  }
};
