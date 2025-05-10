const Badge = require('../models/badge');
const User = require('../models/user');
const createResponse = require('../dto');

exports.getBadges = async (req, res) => {
    try {
        const badges = await Badge.find();
        res.status(200).json(createResponse(true, 'Badges retrieved successfully', badges));
    } catch (error) {
        res.status(500).json(createResponse(false, error.message));
    }
};

exports.awardBadge = async (req, res) => {
    try {
        const { badgeId } = req.params;
        const { userId } = req.user;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json(createResponse(false, 'User not found'));
        }

        user.badges.push(badgeId);

        await user.save();

        res.status(200).json(createResponse(true, 'Badge awarded successfully'));
    } catch (error) {
        res.status(500).json(createResponse(false, error.message));
    }
};  

exports.getBadgeById = async (req, res) => {
    try {
        const { badgeId } = req.params;
        const badge = await Badge.findById(badgeId);

        if (!badge) {
            return res.status(404).json(createResponse(false, 'Badge not found'));
        }

        res.status(200).json(createResponse(true, 'Badge retrieved successfully', badge));
    } catch (error) {
        res.status(500).json(createResponse(false, error.message));
    }
};

exports.createBadge = async (req, res) => {
    try {
        const { name, iconUrl } = req.body;
        const badge = await Badge.create({ name, iconUrl });

        res.status(201).json(createResponse(true, 'Badge created successfully', badge));
    } catch (error) {
        res.status(500).json(createResponse(false, error.message));
    }
};

exports.updateBadge = async (req, res) => {
    try {
        const { badgeId } = req.params;
        const { name, iconUrl } = req.body;
        const badge = await Badge.findByIdAndUpdate(badgeId, { name, iconUrl }, { new: true });

        if (!badge) {
            return res.status(404).json(createResponse(false, 'Badge not found'));
        }

        res.status(200).json(createResponse(true, 'Badge updated successfully', badge));
    } catch (error) {
        res.status(500).json(createResponse(false, error.message));
    }
};

exports.deleteBadge = async (req, res) => {
    try {
        const { badgeId } = req.params;
        const badge = await Badge.findByIdAndDelete(badgeId);

        if (!badge) {
            return res.status(404).json(createResponse(false, 'Badge not found'));
        }

        res.status(200).json(createResponse(true, 'Badge deleted successfully'));
    } catch (error) {
        res.status(500).json(createResponse(false, error.message));
    }
};
