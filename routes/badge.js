const express = require('express');
const router = express.Router();
const badgeController = require('../controller/badge');
const authMiddleware = require('../middleware/auth');
const { upload, handleUpload } = require('../middleware/upload');


router.get('/', badgeController.getBadges);
router.post('/', authMiddleware, upload.single('icon'), handleUpload, badgeController.createBadge);
router.get('/:badgeId', badgeController.getBadgeById);
router.put('/:badgeId', authMiddleware, upload.single('icon'), handleUpload, badgeController.updateBadge);
router.delete('/:badgeId', authMiddleware, badgeController.deleteBadge);
router.post('/:badgeId/award', authMiddleware, badgeController.awardBadge);

module.exports = router;