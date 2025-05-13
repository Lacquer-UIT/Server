const Message = require('../models/message');
const User = require('../models/user');
const Chat = require('../models/chat');
const createResponse = require('../dto');
const mongoose = require('mongoose');

exports.sendMessage = async (req, res) => {
    try {
        const { userId } = req.user;
        const { chatId, content } = req.body;

        const user = await User.findById(userId);
        if(!user) {
            return res.status(404).json(createResponse(false, 'User not found'));
        }

        const chat = await Chat.findById(chatId);
        if(!chat) {
            return res.status(404).json(createResponse(false, 'Chat not found'));
        }

        // Check if user is a participant in the chat
        if (!chat.participants.includes(userId)) {
            return res.status(403).json(createResponse(false, 'You are not a participant in this chat'));
        }

        // Using the correct field name 'text' instead of 'content' based on the schema
        const message = new Message({
            chat: chatId,
            sender: userId,
            text: content,
            readBy: [userId] // Mark as read by sender
        });

        await message.save();

        // Populate sender details for response
        const populatedMessage = await Message.findById(message._id)
            .populate('sender', 'username avatar')
            .lean();

        res.status(201).json(createResponse(true, 'Message sent successfully', populatedMessage));
    } catch (error) {
        res.status(500).json(createResponse(false, error.message));
    }
}

exports.getMessages = async (req, res) => {
    try {
        const { userId } = req.user;
        const { chatId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json(createResponse(false, 'Chat not found'));
        }

        // Check if user is a participant in the chat
        if (!chat.participants.includes(userId)) {
            return res.status(403).json(createResponse(false, 'You are not a participant in this chat'));
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        // Get messages with populated sender info
        const messages = await Message.find({ chat: chatId })
            .populate('sender', 'username avatar')
            .sort({ createdAt: -1 }) // Most recent first
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        // Count total messages for pagination
        const total = await Message.countDocuments({ chat: chatId });
        
        // Mark unread messages as read
        const unreadMessageIds = messages
            .filter(msg => !msg.readBy.includes(userId))
            .map(msg => msg._id);
            
        if (unreadMessageIds.length > 0) {
            await Message.updateMany(
                { _id: { $in: unreadMessageIds } },
                { $addToSet: { readBy: userId } }
            );
        }

        res.status(200).json(createResponse(true, 'Messages retrieved successfully', {
            messages,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        }));
    } catch (error) {
        res.status(500).json(createResponse(false, error.message));
    }
}

exports.markAsRead = async (req, res) => {
    try {
        const { userId } = req.user;
        const { messageId } = req.params;

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json(createResponse(false, 'Message not found'));
        }

        // Check if user is a participant in the chat
        const chat = await Chat.findById(message.chat);
        if (!chat.participants.includes(userId)) {
            return res.status(403).json(createResponse(false, 'You are not a participant in this chat'));
        }

        // Mark message as read if not already
        if (!message.readBy.includes(userId)) {
            message.readBy.push(userId);
            await message.save();
        }

        res.status(200).json(createResponse(true, 'Message marked as read'));
    } catch (error) {
        res.status(500).json(createResponse(false, error.message));
    }
}

exports.getUnreadMessagesCount = async (req, res) => {
    try {
        const { userId } = req.user;
        
        // Get all chats the user is a participant in
        const userChats = await Chat.find({ participants: userId }).select('_id');
        const chatIds = userChats.map(chat => chat._id);
        
        // Count unread messages across all chats
        const unreadCounts = await Message.aggregate([
            {
                $match: {
                    chat: { $in: chatIds },
                    readBy: { $ne: new mongoose.Types.ObjectId(userId) }
                }
            },
            {
                $group: {
                    _id: '$chat',
                    count: { $sum: 1 }
                }
            }
        ]);
        
        // Format the response
        const formattedCounts = {};
        unreadCounts.forEach(item => {
            formattedCounts[item._id.toString()] = item.count;
        });
        
        // Calculate total unread messages
        const totalUnread = unreadCounts.reduce((sum, item) => sum + item.count, 0);
        
        res.status(200).json(createResponse(true, 'Unread messages count retrieved', {
            total: totalUnread,
            byChatId: formattedCounts
        }));
    } catch (error) {
        res.status(500).json(createResponse(false, error.message));
    }
}

exports.getUserUnreadCounts = async (userId) => {
    try {
        // Get all chats the user is a participant in
        const userChats = await Chat.find({ participants: userId }).select('_id');
        const chatIds = userChats.map(chat => chat._id);
        
        // Count unread messages across all chats
        const unreadCounts = await Message.aggregate([
            {
                $match: {
                    chat: { $in: chatIds },
                    sender: { $ne: new mongoose.Types.ObjectId(userId) },
                    readBy: { $ne: new mongoose.Types.ObjectId(userId) }
                }
            },
            {
                $group: {
                    _id: '$chat',
                    count: { $sum: 1 }
                }
            }
        ]);
        
        // Format the response
        const formattedCounts = {};
        unreadCounts.forEach(item => {
            formattedCounts[item._id.toString()] = item.count;
        });
        
        // Calculate total unread messages
        const totalUnread = unreadCounts.reduce((sum, item) => sum + item.count, 0);
        
        return {
            total: totalUnread,
            byChatId: formattedCounts
        };
    } catch (error) {
        console.error('Error counting unread messages:', error);
        throw error;
    }
}
