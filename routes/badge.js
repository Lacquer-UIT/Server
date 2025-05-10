const express = require('express');
const router = express.Router();
const badgeController = require('../controller/badge');
const authMiddleware = require('../middleware/auth');


router.get('/', badgeController.getBadges);
router.post('/', authMiddleware, badgeController.createBadge);
router.get('/:badgeId', badgeController.getBadgeById);
router.put('/:badgeId', authMiddleware, badgeController.updateBadge);
router.delete('/:badgeId', authMiddleware, badgeController.deleteBadge);

module.exports = router;