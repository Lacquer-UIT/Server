const express = require('express');
const router = express.Router();
const chatController = require('../controller/chat');
const messageController = require('../controller/message');
const authMiddleware = require('../middleware/auth');
const User = require('../models/user');
const createResponse = require('../dto');
const jwt = require('jsonwebtoken');

// API Endpoints only - no UI routes

// Chat routes
router.post('/private', authMiddleware, chatController.createPrivateChat);
router.post('/group', authMiddleware, chatController.createGroupChat);
router.get('/', authMiddleware, chatController.getChats);
router.post('/group/members/add', authMiddleware, chatController.addMembersToGroupChat);
router.post('/group/members/remove', authMiddleware, chatController.removeMembersFromGroupChat);

// Message routes
router.post('/message', authMiddleware, messageController.sendMessage);
router.get('/:chatId/messages', authMiddleware, messageController.getMessages);
router.put('/message/:messageId/read', authMiddleware, messageController.markAsRead);
router.get('/messages/unread/count', authMiddleware, messageController.getUnreadMessagesCount);

module.exports = router; 