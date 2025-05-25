const express = require('express');
const router = express.Router();
const postController = require('../controller/post');
const authMiddleware = require('../middleware/auth');
const { upload, handleUpload } = require('../middleware/upload');

/**
 * @swagger
 * components:
 *   schemas:
 *     Post:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         owner:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             username:
 *               type: string
 *             avatar:
 *               type: string
 *             email:
 *               type: string
 *         imageUrl:
 *           type: string
 *         caption:
 *           type: string
 *         visibleTo:
 *           type: array
 *           items:
 *             type: object
 *         reactions:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               user:
 *                 type: object
 *               emoji:
 *                 type: string
 *         createdAt:
 *           type: string
 *         updatedAt:
 *           type: string
 */

/**
 * @swagger
 * /api/posts:
 *   get:
 *     summary: Get all posts from user and friends
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Posts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Post'
 *                 count:
 *                   type: number
 */
router.get('/', authMiddleware, postController.getAllPosts);

/**
 * @swagger
 * /api/posts/user/{userId}:
 *   get:
 *     summary: Get all posts from a specific user
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to get posts from
 *     responses:
 *       200:
 *         description: User posts retrieved successfully
 *       404:
 *         description: User not found
 */
router.get('/user/:userId', authMiddleware, postController.getUserPosts);

/**
 * @swagger
 * /api/posts/{postId}:
 *   get:
 *     summary: Get a single post by ID
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *     responses:
 *       200:
 *         description: Post retrieved successfully
 *       404:
 *         description: Post not found
 *       403:
 *         description: No permission to view this post
 */
router.get('/:postId', authMiddleware, postController.getPostById);

/**
 * @swagger
 * /api/posts:
 *   post:
 *     summary: Create a new post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - imageUrl
 *             properties:
 *               imageUrl:
 *                 type: string
 *                 description: URL of the image
 *               caption:
 *                 type: string
 *                 description: Post caption
 *               isPrivate:
 *                 type: boolean
 *                 description: Whether the post is private
 *               visibleToUsers:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of user IDs who can see the private post
 *     responses:
 *       201:
 *         description: Post created successfully
 *       400:
 *         description: Invalid input data
 */
router.post('/', authMiddleware, postController.createPost);

/**
 * @swagger
 * /api/posts/{postId}:
 *   delete:
 *     summary: Delete a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID to delete
 *     responses:
 *       200:
 *         description: Post deleted successfully
 *       404:
 *         description: Post not found
 *       403:
 *         description: Can only delete your own posts
 */
router.delete('/:postId', authMiddleware, postController.deletePost);

/**
 * @swagger
 * /api/posts/{postId}/private:
 *   patch:
 *     summary: Make a post private
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               visibleToUsers:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of user IDs who can see the private post
 *     responses:
 *       200:
 *         description: Post made private successfully
 *       404:
 *         description: Post not found
 *       403:
 *         description: Can only modify your own posts
 */
router.patch('/:postId/private', authMiddleware, postController.makePostPrivate);

/**
 * @swagger
 * /api/posts/{postId}/public:
 *   patch:
 *     summary: Make a post public
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *     responses:
 *       200:
 *         description: Post made public successfully
 *       404:
 *         description: Post not found
 *       403:
 *         description: Can only modify your own posts
 */
router.patch('/:postId/public', authMiddleware, postController.makePostPublic);

/**
 * @swagger
 * /api/posts/{postId}/reaction:
 *   post:
 *     summary: Add a reaction to a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - emoji
 *             properties:
 *               emoji:
 *                 type: string
 *                 description: Emoji reaction
 *     responses:
 *       200:
 *         description: Reaction added successfully
 *       400:
 *         description: User already reacted or invalid emoji
 *       404:
 *         description: Post not found
 *       403:
 *         description: No permission to react to this post
 */
router.post('/:postId/reaction', authMiddleware, postController.sendReaction);

/**
 * @swagger
 * /api/posts/{postId}/reaction:
 *   patch:
 *     summary: Change reaction on a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - emoji
 *             properties:
 *               emoji:
 *                 type: string
 *                 description: New emoji reaction
 *     responses:
 *       200:
 *         description: Reaction updated successfully
 *       404:
 *         description: Post not found or no existing reaction
 *       403:
 *         description: No permission to react to this post
 */
router.patch('/:postId/reaction', authMiddleware, postController.changeReaction);

/**
 * @swagger
 * /api/posts/{postId}/reaction:
 *   delete:
 *     summary: Remove reaction from a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *     responses:
 *       200:
 *         description: Reaction removed successfully
 *       404:
 *         description: Post not found or no reaction to remove
 *       403:
 *         description: No permission to interact with this post
 */
router.delete('/:postId/reaction', authMiddleware, postController.removeReaction);

/**
 * @swagger
 * /api/posts/{postId}/download:
 *   get:
 *     summary: Download image from a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *     responses:
 *       200:
 *         description: Image file
 *         content:
 *           image/*:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Post not found
 *       403:
 *         description: No permission to download this image
 *       500:
 *         description: Error downloading image
 */
router.get('/:postId/download', authMiddleware, postController.downloadImage);

/**
 * @swagger
 * /api/posts/upload:
 *   post:
 *     summary: Create a new post with image upload
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file to upload (max 10MB)
 *               caption:
 *                 type: string
 *                 description: Post caption
 *               isPrivate:
 *                 type: boolean
 *                 description: Whether the post is private
 *               visibleToUsers:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of user IDs who can see the private post (JSON string)
 *     responses:
 *       201:
 *         description: Post created successfully with uploaded image
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Post'
 *                 uploadInfo:
 *                   type: object
 *                   properties:
 *                     cloudinaryUrl:
 *                       type: string
 *                     publicId:
 *                       type: string
 *                     format:
 *                       type: string
 *                     width:
 *                       type: number
 *                     height:
 *                       type: number
 *       400:
 *         description: Invalid input data or missing image
 *       413:
 *         description: File too large (max 10MB)
 */
router.post('/upload', authMiddleware, upload.single('image'), handleUpload, postController.createPostWithUpload);

module.exports = router; 