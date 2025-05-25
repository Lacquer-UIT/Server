const Post = require('../models/post');
const User = require('../models/user');
const Friendship = require('../models/friendship');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const axios = require('axios');

// Get all posts (me and friends)
const getAllPosts = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's friends
    const friendships = await Friendship.find({
      $or: [
        { requester: userId, status: 'accepted' },
        { recipient: userId, status: 'accepted' }
      ]
    });
    
    const friendIds = friendships.map(friendship => 
      friendship.requester.toString() === userId ? friendship.recipient : friendship.requester
    );
    
    // Include user's own ID
    const allowedUserIds = [userId, ...friendIds];
    
    // Get posts that are either:
    // 1. Public posts from friends and self
    // 2. Private posts where user is in visibleTo array
    const posts = await Post.find({
      $or: [
        {
          owner: { $in: allowedUserIds },
          visibleTo: { $size: 0 } // Public posts (empty visibleTo array)
        },
        {
          visibleTo: userId // Private posts where user is specifically included
        }
      ]
    })
    .populate('owner', 'username avatar email')
    .populate('reactions.user', 'username avatar')
    .populate('visibleTo', 'username')
    .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: posts,
      count: posts.length
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching posts',
      error: error.message
    });
  }
};

// Get all posts from a specific user
const getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;
    
    // Check if the requested user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if current user is friends with target user or is the same user
    let canViewPrivatePosts = false;
    
    if (currentUserId === userId) {
      canViewPrivatePosts = true;
    } else {
      const friendship = await Friendship.findOne({
        $or: [
          { requester: currentUserId, recipient: userId, status: 'accepted' },
          { requester: userId, recipient: currentUserId, status: 'accepted' }
        ]
      });
      canViewPrivatePosts = !!friendship;
    }
    
    let query = { owner: userId };
    
    if (!canViewPrivatePosts) {
      // Only show public posts if not friends
      query.visibleTo = { $size: 0 };
    } else {
      // Show all posts if friends or own posts, but filter private posts user can't see
      query = {
        owner: userId,
        $or: [
          { visibleTo: { $size: 0 } }, // Public posts
          { visibleTo: currentUserId } // Private posts user can see
        ]
      };
    }
    
    const posts = await Post.find(query)
      .populate('owner', 'username avatar email')
      .populate('reactions.user', 'username avatar')
      .populate('visibleTo', 'username')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: posts,
      count: posts.length,
      user: {
        id: targetUser._id,
        username: targetUser.username,
        avatar: targetUser.avatar
      }
    });
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user posts',
      error: error.message
    });
  }
};

// Create a new post
const createPost = async (req, res) => {
  try {
    const { imageUrl, caption, isPrivate, visibleToUsers } = req.body;
    const userId = req.user.id;
    
    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Image URL is required'
      });
    }
    
    let visibleTo = [];
    
    if (isPrivate && visibleToUsers && Array.isArray(visibleToUsers)) {
      // Validate that all users in visibleToUsers exist and are friends
      const friendships = await Friendship.find({
        $or: [
          { requester: userId, recipient: { $in: visibleToUsers }, status: 'accepted' },
          { requester: { $in: visibleToUsers }, recipient: userId, status: 'accepted' }
        ]
      });
      
      const friendIds = friendships.map(friendship => 
        friendship.requester.toString() === userId ? friendship.recipient.toString() : friendship.requester.toString()
      );
      
      // Only include users who are actually friends
      visibleTo = visibleToUsers.filter(id => friendIds.includes(id));
    }
    
    const newPost = new Post({
      owner: userId,
      imageUrl,
      caption: caption || null,
      visibleTo
    });
    
    const savedPost = await newPost.save();
    
    const populatedPost = await Post.findById(savedPost._id)
      .populate('owner', 'username avatar email')
      .populate('visibleTo', 'username avatar');
    
    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      data: populatedPost
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating post',
      error: error.message
    });
  }
};

// Create a new post with image upload
const createPostWithUpload = async (req, res) => {
  try {
    const { caption, isPrivate, visibleToUsers } = req.body;
    const userId = req.user.id;
    
    // Check if image was uploaded
    if (!req.uploadedFile) {
      return res.status(400).json({
        success: false,
        message: 'Image upload is required'
      });
    }
    
    // Get the Cloudinary URL from the uploaded file
    const imageUrl = req.uploadedFile.secure_url;
    
    let visibleTo = [];
    
    if (isPrivate && visibleToUsers && Array.isArray(visibleToUsers)) {
      // Validate that all users in visibleToUsers exist and are friends
      const friendships = await Friendship.find({
        $or: [
          { requester: userId, recipient: { $in: visibleToUsers }, status: 'accepted' },
          { requester: { $in: visibleToUsers }, recipient: userId, status: 'accepted' }
        ]
      });
      
      const friendIds = friendships.map(friendship => 
        friendship.requester.toString() === userId ? friendship.recipient.toString() : friendship.requester.toString()
      );
      
      // Only include users who are actually friends
      visibleTo = visibleToUsers.filter(id => friendIds.includes(id));
    }
    
    const newPost = new Post({
      owner: userId,
      imageUrl,
      caption: caption || null,
      visibleTo
    });
    
    const savedPost = await newPost.save();
    
    const populatedPost = await Post.findById(savedPost._id)
      .populate('owner', 'username avatar email')
      .populate('visibleTo', 'username avatar');
    
    res.status(201).json({
      success: true,
      message: 'Post created successfully with uploaded image',
      data: populatedPost,
      uploadInfo: {
        cloudinaryUrl: imageUrl,
        publicId: req.uploadedFile.public_id,
        format: req.uploadedFile.format,
        width: req.uploadedFile.width,
        height: req.uploadedFile.height
      }
    });
  } catch (error) {
    console.error('Error creating post with upload:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating post with upload',
      error: error.message
    });
  }
};

// Delete a post
const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;
    
    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    // Check if user owns the post
    if (post.owner.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own posts'
      });
    }
    
    await Post.findByIdAndDelete(postId);
    
    res.status(200).json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting post',
      error: error.message
    });
  }
};

// Make post private
const makePostPrivate = async (req, res) => {
  try {
    const { postId } = req.params;
    const { visibleToUsers } = req.body;
    const userId = req.user.id;
    
    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    if (post.owner.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only modify your own posts'
      });
    }
    
    let visibleTo = [];
    
    if (visibleToUsers && Array.isArray(visibleToUsers)) {
      // Validate that all users are friends
      const friendships = await Friendship.find({
        $or: [
          { requester: userId, recipient: { $in: visibleToUsers }, status: 'accepted' },
          { requester: { $in: visibleToUsers }, recipient: userId, status: 'accepted' }
        ]
      });
      
      const friendIds = friendships.map(friendship => 
        friendship.requester.toString() === userId ? friendship.recipient.toString() : friendship.requester.toString()
      );
      
      visibleTo = visibleToUsers.filter(id => friendIds.includes(id));
    }
    
    post.visibleTo = visibleTo;
    await post.save();
    
    const updatedPost = await Post.findById(postId)
      .populate('owner', 'username avatar email')
      .populate('visibleTo', 'username avatar');
    
    res.status(200).json({
      success: true,
      message: 'Post made private successfully',
      data: updatedPost
    });
  } catch (error) {
    console.error('Error making post private:', error);
    res.status(500).json({
      success: false,
      message: 'Error making post private',
      error: error.message
    });
  }
};

// Make post public
const makePostPublic = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;
    
    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    if (post.owner.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only modify your own posts'
      });
    }
    
    post.visibleTo = [];
    await post.save();
    
    const updatedPost = await Post.findById(postId)
      .populate('owner', 'username avatar email')
      .populate('visibleTo', 'username avatar');
    
    res.status(200).json({
      success: true,
      message: 'Post made public successfully',
      data: updatedPost
    });
  } catch (error) {
    console.error('Error making post public:', error);
    res.status(500).json({
      success: false,
      message: 'Error making post public',
      error: error.message
    });
  }
};

// Send reaction to a post
const sendReaction = async (req, res) => {
  try {
    const { postId } = req.params;
    const { emoji } = req.body;
    const userId = req.user.id;
    
    if (!emoji) {
      return res.status(400).json({
        success: false,
        message: 'Emoji is required'
      });
    }
    
    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    // Check if user can see this post
    const canSeePost = await checkPostVisibility(post, userId);
    if (!canSeePost) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to react to this post'
      });
    }
    
    // Check if user already reacted
    const existingReactionIndex = post.reactions.findIndex(
      reaction => reaction.user.toString() === userId
    );
    
    if (existingReactionIndex !== -1) {
      return res.status(400).json({
        success: false,
        message: 'You have already reacted to this post. Use change reaction endpoint to modify.'
      });
    }
    
    // Add new reaction
    post.reactions.push({
      user: userId,
      emoji
    });
    
    await post.save();
    
    const updatedPost = await Post.findById(postId)
      .populate('owner', 'username avatar email')
      .populate('reactions.user', 'username avatar')
      .populate('visibleTo', 'username avatar');
    
    res.status(200).json({
      success: true,
      message: 'Reaction added successfully',
      data: updatedPost
    });
  } catch (error) {
    console.error('Error sending reaction:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending reaction',
      error: error.message
    });
  }
};

// Change reaction on a post
const changeReaction = async (req, res) => {
  try {
    const { postId } = req.params;
    const { emoji } = req.body;
    const userId = req.user.id;
    
    if (!emoji) {
      return res.status(400).json({
        success: false,
        message: 'Emoji is required'
      });
    }
    
    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    // Check if user can see this post
    const canSeePost = await checkPostVisibility(post, userId);
    if (!canSeePost) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to react to this post'
      });
    }
    
    // Find existing reaction
    const existingReactionIndex = post.reactions.findIndex(
      reaction => reaction.user.toString() === userId
    );
    
    if (existingReactionIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'No existing reaction found. Use send reaction endpoint to add a new reaction.'
      });
    }
    
    // Update reaction
    post.reactions[existingReactionIndex].emoji = emoji;
    await post.save();
    
    const updatedPost = await Post.findById(postId)
      .populate('owner', 'username avatar email')
      .populate('reactions.user', 'username avatar')
      .populate('visibleTo', 'username avatar');
    
    res.status(200).json({
      success: true,
      message: 'Reaction updated successfully',
      data: updatedPost
    });
  } catch (error) {
    console.error('Error changing reaction:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing reaction',
      error: error.message
    });
  }
};

// Remove reaction from a post
const removeReaction = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;
    
    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    // Check if user can see this post
    const canSeePost = await checkPostVisibility(post, userId);
    if (!canSeePost) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to interact with this post'
      });
    }
    
    // Find and remove reaction
    const reactionIndex = post.reactions.findIndex(
      reaction => reaction.user.toString() === userId
    );
    
    if (reactionIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'No reaction found to remove'
      });
    }
    
    post.reactions.splice(reactionIndex, 1);
    await post.save();
    
    const updatedPost = await Post.findById(postId)
      .populate('owner', 'username avatar email')
      .populate('reactions.user', 'username avatar')
      .populate('visibleTo', 'username avatar');
    
    res.status(200).json({
      success: true,
      message: 'Reaction removed successfully',
      data: updatedPost
    });
  } catch (error) {
    console.error('Error removing reaction:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing reaction',
      error: error.message
    });
  }
};

// Download image from post
const downloadImage = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;
    
    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    // Check if user can see this post
    const canSeePost = await checkPostVisibility(post, userId);
    if (!canSeePost) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to download this image'
      });
    }
    
    try {
      // Fetch the image from the URL
      const response = await axios({
        method: 'GET',
        url: post.imageUrl,
        responseType: 'stream'
      });
      
      // Set appropriate headers
      const contentType = response.headers['content-type'] || 'image/jpeg';
      const filename = `post_${postId}_image.${contentType.split('/')[1] || 'jpg'}`;
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      // Pipe the image data to the response
      response.data.pipe(res);
      
    } catch (downloadError) {
      console.error('Error downloading image:', downloadError);
      res.status(500).json({
        success: false,
        message: 'Error downloading image',
        error: 'Failed to fetch image from URL'
      });
    }
  } catch (error) {
    console.error('Error in download image:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing download request',
      error: error.message
    });
  }
};

// Helper function to check if user can see a post
const checkPostVisibility = async (post, userId) => {
  // If post is public (empty visibleTo array), everyone can see it
  if (post.visibleTo.length === 0) {
    return true;
  }
  
  // If user is the owner, they can always see it
  if (post.owner.toString() === userId) {
    return true;
  }
  
  // If user is in the visibleTo array, they can see it
  if (post.visibleTo.some(id => id.toString() === userId)) {
    return true;
  }
  
  return false;
};

// Get single post by ID
const getPostById = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;
    
    const post = await Post.findById(postId)
      .populate('owner', 'username avatar email')
      .populate('reactions.user', 'username avatar')
      .populate('visibleTo', 'username avatar');
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    // Check if user can see this post
    const canSeePost = await checkPostVisibility(post, userId);
    if (!canSeePost) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this post'
      });
    }
    
    res.status(200).json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching post',
      error: error.message
    });
  }
};

module.exports = {
  getAllPosts,
  getUserPosts,
  createPost,
  createPostWithUpload,
  deletePost,
  makePostPrivate,
  makePostPublic,
  sendReaction,
  changeReaction,
  removeReaction,
  downloadImage,
  getPostById
}; 