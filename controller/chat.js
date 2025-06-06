const Chat = require('../models/chat');
const User = require('../models/user');
const Message = require('../models/message');
const createResponse = require('../dto');
const mongoose = require('mongoose');

exports.createPrivateChat = async (req, res) => {
    try {
        const { userId } = req.user;
        const { friendId } = req.body;

        console.log('🔹 Creating private chat - userId from token:', userId);
        console.log('🔹 Creating private chat - friendId from body:', friendId);
        console.log('🔹 Request body:', req.body);

        const user = await User.findById(userId);
        const friend = await User.findById(friendId);
        
        console.log('🔹 User lookup result:', user ? 'Found' : 'Not found');
        console.log('🔹 Friend lookup result:', friend ? 'Found' : 'Not found');
        
        if(!friend) {
            return res.status(404).json(createResponse(false, 'Friend not found'));
        }
        if(!user ) {
            return res.status(404).json(createResponse(false, 'User not found'));
        }
        
        const chat = await Chat.findOne({
            participants: { $all: [userId, friendId] }
        });
        if(chat) {
            return res.status(400).json(createResponse(false, 'Chat already exists'));
        }

        const newChat = new Chat({
            participants: [userId, friendId]
        });
        await newChat.save();

        res.status(201).json(createResponse(true, 'Private chat created successfully', newChat));
    } catch (error) {
        console.error('❌ Error in createPrivateChat:', error);
        res.status(500).json(createResponse(false, error.message));
    }
}

exports.createGroupChat = async (req, res) => {
    try {
        const { userId } = req.user;
        const { name, description, admin, avatar, participants } = req.body;

        const user = await User.findById(userId);
        if(!user) {
            return res.status(404).json(createResponse(false, 'User not found'));
        }
        
        // Validate participants array
        if (!participants || !Array.isArray(participants) || participants.length === 0) {
            return res.status(400).json(createResponse(false, 'Participants list is required and cannot be empty'));
        }

        // Check if all participant IDs are valid
        const validParticipantIds = participants.every(id => mongoose.Types.ObjectId.isValid(id));
        if (!validParticipantIds) {
            return res.status(400).json(createResponse(false, 'Invalid participant ID format'));
        }

        // Check if all participants exist in the database
        const participantCount = await User.countDocuments({
            _id: { $in: participants }
        });
        
        if (participantCount !== participants.length) {
            return res.status(400).json(createResponse(false, 'One or more participants do not exist'));
        }

        // Ensure the creator is included in the participants
        if (!participants.includes(userId)) {
            participants.push(userId);
        }

        // Set admin if provided, otherwise default to creator
        let admins = [userId]; // Default to creator
        if (admin) {
            // Validate admin is one of the participants
            if (!participants.includes(admin)) {
                return res.status(400).json(createResponse(false, 'Admin must be one of the participants'));
            }
            admins = [admin];
        }

        const newChat = new Chat({
            name,
            description,
            participants,
            admins,
            avatar, // Add optional avatar field
            isGroup: true // Ensure it's marked as a group chat
        });
        await newChat.save();

        res.status(201).json(createResponse(true, 'Group chat created successfully', newChat));
    } catch (error) {
        res.status(500).json(createResponse(false, error.message));
    }
} 

exports.getChats = async (req, res) => {
    try {
        const { userId } = req.user;
        
        // Aggregate chats with their latest messages
        const chats = await Chat.aggregate([
            // Match chats where the user is a participant
            { $match: { participants: new mongoose.Types.ObjectId(userId) } },
            
            // Lookup the latest message for each chat
            {
                $lookup: {
                    from: 'messages',
                    let: { chatId: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$chat', '$$chatId'] } } },
                        { $sort: { createdAt: -1 } },
                        { $limit: 1 }
                    ],
                    as: 'latestMessage'
                }
            },
            
            // Lookup participant details
            {
                $lookup: {
                    from: 'users',
                    localField: 'participants',
                    foreignField: '_id',
                    as: 'participantDetails'
                }
            },
            
            // Project participant details with required fields
            {
                $addFields: {
                    participants: {
                        $map: {
                            input: '$participantDetails',
                            as: 'participant',
                            in: {
                                _id: '$$participant._id',
                                username: '$$participant.username',
                                avatar: '$$participant.avatar'
                            }
                        }
                    }
                }
            },
            
            // Remove the temporary participantDetails field
            {
                $project: {
                    participantDetails: 0
                }
            },
            
            // Unwind the latestMessage array to a single object or null
            {
                $unwind: {
                    path: '$latestMessage',
                    preserveNullAndEmptyArrays: true
                }
            },
            
            // Sort by the latest message timestamp (descending)
            { $sort: { 'latestMessage.createdAt': -1, 'createdAt': -1 } },
            
            // Add a field for last message time (for easier client-side handling)
            {
                $addFields: {
                    lastMessageTime: { $ifNull: ['$latestMessage.createdAt', '$createdAt'] }
                }
            }
        ]);
        
        res.status(200).json(createResponse(true, 'Chats fetched successfully', chats));
    } catch (error) {
        res.status(500).json(createResponse(false, error.message));
    }
}

exports.addMembersToGroupChat = async (req, res) => {
    try {
        const { userId } = req.user;
        const { chatId, members } = req.body;

        const chat = await Chat.findById(chatId);
        if(!chat) {
            return res.status(404).json(createResponse(false, 'Chat not found'));
        }
        // Check if the chat is a group chat
        if (!chat.isGroup) {
            return res.status(400).json(createResponse(false, 'Cannot add members to a non-group chat'));
        }
        
        // Check if the user is an admin of the group
        if (!chat.admins.includes(userId)) {
            return res.status(403).json(createResponse(false, 'Only group admins can add members'));
        }
        
        // Validate members array
        if (!members || !Array.isArray(members) || members.length === 0) {
            return res.status(400).json(createResponse(false, 'Please provide valid members to add'));
        }
        
        // Validate each member ID format
        const validMemberIds = members.every(id => mongoose.Types.ObjectId.isValid(id));
        if (!validMemberIds) {
            return res.status(400).json(createResponse(false, 'Invalid member ID format'));
        }
        
        // Check if members exist in the database
        const existingUsers = await User.find({ _id: { $in: members } });
        if (existingUsers.length !== members.length) {
            return res.status(400).json(createResponse(false, 'One or more users do not exist'));
        }
        
        // Filter out members who are already in the chat
        const newMembers = members.filter(member => !chat.participants.includes(member));
        if (newMembers.length === 0) {
            return res.status(400).json(createResponse(false, 'All specified users are already members of this chat'));
        }

        // Add new members to the chat
        chat.participants.push(...newMembers);
        await chat.save();
        
        res.status(200).json(createResponse(true, 'Members added to group chat successfully'));
    } catch (error) {
        res.status(500).json(createResponse(false, error.message));
    }
}

exports.removeMembersFromGroupChat = async (req, res) => {
    try {
        const { userId } = req.user;
        const { chatId, members } = req.body;

        const chat = await Chat.findById(chatId);
        if(!chat) {
            return res.status(404).json(createResponse(false, 'Chat not found'));
        }
        
        // Check if the chat is a group chat
        if (!chat.isGroup) {
            return res.status(400).json(createResponse(false, 'Cannot remove members from a non-group chat'));
        }
        
        // Check if the user is an admin of the group
        if (!chat.admins.includes(userId)) {
            return res.status(403).json(createResponse(false, 'Only group admins can remove members'));
        }
        
        // Validate members array
        if (!members || !Array.isArray(members) || members.length === 0) {
            return res.status(400).json(createResponse(false, 'Please provide valid members to remove'));
        }
        
        // Validate each member ID format
        const validMemberIds = members.every(id => mongoose.Types.ObjectId.isValid(id));
        if (!validMemberIds) {
            return res.status(400).json(createResponse(false, 'Invalid member ID format'));
        }
        
        // Check if members exist in the database
        const existingUsers = await User.find({ _id: { $in: members } });
        if (existingUsers.length !== members.length) {
            return res.status(400).json(createResponse(false, 'One or more users do not exist'));
        }
        
        // Filter out members who are not in the chat
        const remainingMembers = chat.participants.filter(member => !members.includes(member));
        if (remainingMembers.length === 0) {
            return res.status(400).json(createResponse(false, 'Cannot remove all members from the chat'));
        }

        // Remove members from the chat
        chat.participants = remainingMembers;
        await chat.save();

        res.status(200).json(createResponse(true, 'Members removed from group chat successfully'));
    } catch (error) {
        res.status(500).json(createResponse(false, error.message));
    }
}

exports.loadMessages = async (req, res) => {
    try {
        const { userId } = req.user;
        const { chatId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const chat = await Chat.findById(chatId);
        if(!chat) {
            return res.status(404).json(createResponse(false, 'Chat not found'));
        }
        
        // Check if the user is a participant in the chat
        if (!chat.participants.includes(userId)) {
            return res.status(403).json(createResponse(false, 'You are not a participant in this chat'));
        }
        
        // Calculate the skip value based on the page and limit
        const skip = (page - 1) * limit;
        
        // Sort messages by creation date in descending order
        const messages = await Message.find({ chat: chatId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        
        // Mark messages as read by the current user
        const messageIds = messages.map(message => message._id);
        await Message.updateMany(
            { 
                _id: { $in: messageIds },
                readBy: { $ne: userId }
            },
            { 
                $addToSet: { readBy: userId } 
            }
        );
        
        // Count total messages for pagination
        const totalMessages = await Message.countDocuments({ chat: chatId });
        const totalPages = Math.ceil(totalMessages / limit);
        
        res.status(200).json(createResponse(true, 'Messages loaded successfully', {
            messages,
            totalPages,
            currentPage: parseInt(page)
        }));
    } catch (error) {
        res.status(500).json(createResponse(false, error.message));
    }
}

exports.getUserChats = async (userId) => {
    try {
        // Aggregate chats with their latest messages and other participant details
        const chats = await Chat.aggregate([
            // Match chats where the user is a participant
            { $match: { participants: new mongoose.Types.ObjectId(userId) } },
            
            // Lookup the latest message for each chat
            {
                $lookup: {
                    from: 'messages',
                    let: { chatId: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$chat', '$$chatId'] } } },
                        { $sort: { createdAt: -1 } },
                        { $limit: 1 }
                    ],
                    as: 'latestMessage'
                }
            },
            
            // Lookup participant details
            {
                $lookup: {
                    from: 'users',
                    localField: 'participants',
                    foreignField: '_id',
                    as: 'participants'
                }
            },
            
            // Project only needed fields from participants
            {
                $project: {
                    _id: 1,
                    name: 1,
                    isGroup: 1,
                    avatar: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    latestMessage: { $arrayElemAt: ['$latestMessage', 0] },
                    participants: {
                        $map: {
                            input: '$participants',
                            as: 'participant',
                            in: {
                                _id: '$$participant._id',
                                username: '$$participant.username',
                                avatar: '$$participant.avatar'
                            }
                        }
                    }
                }
            },
            
            // Unwind the latestMessage array to a single object or null
            {
                $unwind: {
                    path: '$latestMessage',
                    preserveNullAndEmptyArrays: true
                }
            },
            
            // Sort by the latest message timestamp (descending)
            { $sort: { 'latestMessage.createdAt': -1, 'createdAt': -1 } }
        ]);
        
        return chats;
    } catch (error) {
        console.error('Error fetching user chats:', error);
        throw error;
    }
}

