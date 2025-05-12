const express = require('express');
const router = express.Router();
const tagController = require('../controller/tags');
const authMiddleware = require('../middleware/auth');

// Public routes
router.get('/', tagController.getAllTags);
router.get('/:id', tagController.getTagById);

// Protected routes (admin only)
router.post('/', authMiddleware, tagController.createTag);
router.put('/:id', authMiddleware, tagController.updateTag);
router.delete('/:id', authMiddleware, tagController.deleteTag);

module.exports = router; 