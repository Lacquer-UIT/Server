/**
 * Chat API Client Reference
 * 
 * This file serves as a guide for connecting to the chat server API
 * using Socket.IO and making API calls. No UI functionality is included.
 */

// Socket.IO Connection Example
const connectToSocketServer = (token) => {
  const socket = io({
    auth: { token }
  });
  
  // Connection success
  socket.on('connect', () => {
    console.log('Connected to chat server');
    // Join user's chat rooms
    socket.emit('join:chats');
  });
  
  // Connection error
  socket.on('connect_error', (error) => {
    console.error('Connection error:', error.message);
  });
  
  // Event Listeners
  socket.on('chats:joined', (chatIds) => {
    console.log('Joined chat rooms:', chatIds);
  });
  
  socket.on('users:online', (userIds) => {
    console.log('Online users:', userIds);
  });
  
  socket.on('message:received', (message) => {
    console.log('New message received:', message);
  });
  
  socket.on('notification:new_message', (data) => {
    console.log('New message notification:', data);
  });
  
  socket.on('user:typing', (data) => {
    console.log('User typing:', data);
  });
  
  socket.on('user:stopped_typing', (data) => {
    console.log('User stopped typing:', data);
  });
  
  socket.on('message:seen', (data) => {
    console.log('Message seen:', data);
  });
  
  return socket;
};

// API Endpoints Reference

/**
 * Send a message
 * @param {string} chatId - ID of the chat
 * @param {string} content - Message content
 * @param {string} token - JWT token
 */
const sendMessage = async (chatId, content, token) => {
  try {
    const response = await fetch('/chat/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ chatId, content })
    });
    return await response.json();
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

/**
 * Get messages from a chat
 * @param {string} chatId - ID of the chat
 * @param {number} page - Page number for pagination
 * @param {number} limit - Number of messages per page
 * @param {string} token - JWT token
 */
const getMessages = async (chatId, page = 1, limit = 20, token) => {
  try {
    const response = await fetch(`/chat/${chatId}/messages?page=${page}&limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return await response.json();
  } catch (error) {
    console.error('Error getting messages:', error);
    throw error;
  }
};

/**
 * Mark a message as read
 * @param {string} messageId - ID of the message
 * @param {string} token - JWT token
 */
const markMessageAsRead = async (messageId, token) => {
  try {
    const response = await fetch(`/chat/message/${messageId}/read`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return await response.json();
  } catch (error) {
    console.error('Error marking message as read:', error);
    throw error;
  }
};

/**
 * Get unread message counts
 * @param {string} token - JWT token
 */
const getUnreadCount = async (token) => {
  try {
    const response = await fetch('/chat/messages/unread/count', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return await response.json();
  } catch (error) {
    console.error('Error getting unread counts:', error);
    throw error;
  }
};

/**
 * Create a private chat
 * @param {string} friendId - ID of the user to chat with
 * @param {string} token - JWT token
 */
const createPrivateChat = async (friendId, token) => {
  try {
    const response = await fetch('/chat/private', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ friendId })
    });
    return await response.json();
  } catch (error) {
    console.error('Error creating private chat:', error);
    throw error;
  }
};

/**
 * Create a group chat
 * @param {object} groupData - Group chat data
 * @param {string} token - JWT token
 */
const createGroupChat = async (groupData, token) => {
  try {
    const response = await fetch('/chat/group', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(groupData)
    });
    return await response.json();
  } catch (error) {
    console.error('Error creating group chat:', error);
    throw error;
  }
}; 