const express = require('express');
const router = express.Router();
const postController = require('../controller/post');
const authMiddleware = require('../middleware/auth');
const { upload, handleUpload } = require('../middleware/upload');

router.get('/', authMiddleware, postController.getAllPosts);
router.get('/user/:userId', authMiddleware, postController.getUserPosts);
router.get('/:postId', authMiddleware, postController.getPostById);
router.delete('/:postId', authMiddleware, postController.deletePost);
router.patch('/:postId/private', authMiddleware, postController.makePostPrivate);
router.patch('/:postId/public', authMiddleware, postController.makePostPublic);
router.post('/:postId/reaction', authMiddleware, postController.sendReaction);
router.patch('/:postId/reaction', authMiddleware, postController.changeReaction);
router.delete('/:postId/reaction', authMiddleware, postController.removeReaction);
router.get('/:postId/download', authMiddleware, postController.downloadImage);
router.post('/upload', authMiddleware, upload.single('image'), handleUpload, postController.createPostWithUpload);

module.exports = router; 