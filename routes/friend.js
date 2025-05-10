const express = require('express');
const router = express.Router();
const { requestFriendship, acceptFriendship, rejectFriendship, getFriendRequests, getFriends, blockFriend, unblockFriend, getBlockedFriends } = require('../controller/friendship');
const authMiddleware = require('../middleware/auth');

router.post('/request', authMiddleware, requestFriendship);
router.post('/accept', authMiddleware, acceptFriendship);
router.post('/reject', authMiddleware, rejectFriendship);
router.get('/requests', authMiddleware, getFriendRequests);
router.get('/friends', authMiddleware, getFriends);
router.post('/block', authMiddleware, blockFriend);
router.post('/unblock', authMiddleware, unblockFriend);
router.get('/blocked', authMiddleware, getBlockedFriends);

module.exports = router;