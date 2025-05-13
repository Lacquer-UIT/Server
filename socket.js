const jwt = require('jsonwebtoken');
const User = require('./models/user');
const Chat = require('./models/chat');
const Message = require('./models/message');
const mongoose = require('mongoose');

/**
 * Socket.IO server implementation for real-time chat
 * @param {SocketIO.Server} io - The Socket.IO server instance
 */
module.exports = (io) => {
  // Track online users - Map of userId to socketId
  const onlineUsers = new Map();

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }
      
      // Attach user data to socket
      socket.userId = decoded.userId;
      socket.username = user.username;
      next();
    } catch (error) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);
    
    // Add user to online users
    onlineUsers.set(socket.userId, socket.id);
    
    // Emit online users to all connected clients
    io.emit('users:online', Array.from(onlineUsers.keys()));

    // Join user to their chat rooms
    socket.on('join:chats', async () => {
      try {
        // Find all chats where the user is a participant
        const userChats = await Chat.find({
          participants: socket.userId
        });
        
        // Join socket rooms for each chat
        userChats.forEach(chat => {
          socket.join(chat._id.toString());
        });
        
        socket.emit('chats:joined', userChats.map(chat => chat._id.toString()));
      } catch (error) {
        console.error('Error joining chat rooms:', error);
      }
    });

    // Handle new message
    socket.on('message:send', async (data) => {
      try {
        const { chatId, content } = data;
        
        // Validate chat existence and user membership
        const chat = await Chat.findById(chatId);
        if (!chat) {
          socket.emit('error', { message: 'Chat not found' });
          return;
        }
        
        if (!chat.participants.includes(socket.userId)) {
          socket.emit('error', { message: 'You are not a participant in this chat' });
          return;
        }
        
        // Create and save the message
        const newMessage = new Message({
          chat: chatId,
          sender: socket.userId,
          text: content,
          readBy: [socket.userId] // Mark as read by sender
        });
        
        await newMessage.save();
        
        // Populate sender details for the frontend
        const populatedMessage = await Message.findById(newMessage._id)
          .populate('sender', 'username avatar')
          .lean();
        
        // Emit to all users in the chat room
        io.to(chatId).emit('message:received', populatedMessage);
        
        // Send notifications to other participants
        chat.participants.forEach(participantId => {
          const participantIdStr = participantId.toString();
          // Skip sender
          if (participantIdStr !== socket.userId) {
            const participantSocketId = onlineUsers.get(participantIdStr);
            
            // If participant is online, send notification
            if (participantSocketId) {
              io.to(participantSocketId).emit('notification:new_message', {
                chatId,
                message: populatedMessage
              });
            }
          }
        });
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: error.message });
      }
    });

    // Handle typing indicator
    socket.on('typing:start', (chatId) => {
      socket.to(chatId).emit('user:typing', {
        chatId,
        userId: socket.userId,
        username: socket.username
      });
    });

    socket.on('typing:stop', (chatId) => {
      socket.to(chatId).emit('user:stopped_typing', {
        chatId,
        userId: socket.userId
      });
    });

    // Handle read receipts
    socket.on('message:read', async (data) => {
      try {
        const { chatId, messageId } = data;
        
        // Update the readBy array for the message
        await Message.findByIdAndUpdate(
          messageId,
          { $addToSet: { readBy: socket.userId } }
        );
        
        // Notify other users in the chat
        socket.to(chatId).emit('message:seen', {
          chatId,
          messageId,
          userId: socket.userId
        });
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
      
      // Remove user from online users
      onlineUsers.delete(socket.userId);
      
      // Emit updated online users list
      io.emit('users:online', Array.from(onlineUsers.keys()));
    });
  });
}; 