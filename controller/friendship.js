const Friendship = require('../models/friendship');
const User = require('../models/user');
const createResponse = require('../dto');

exports.requestFriendship = async (req, res) => {
    try {
        const { userId } = req.user.userId;
        const { friendId } = req.body;

        const user = await User.findById(userId);
        const friend = await User.findById(friendId);

        if (!user || !friend) {
            return res.status(404).json(createResponse(false, 'User not found'));
        }   


        // you blocked each other
        const blockedRequest = await Friendship.findOne({
            $or: [
                { requester: userId, recipient: friendId, status: 'blocked' },
                { requester: friendId, recipient: userId, status: 'blocked' }
            ]
        });
        if (blockedRequest) {
            return res.status(400).json(createResponse(false, 'you blocked each other'));
        }

        // you are already friends
        const alreadyFriends = await Friendship.findOne({
            $or: [
                { requester: userId, recipient: friendId, status: 'accepted' },
                { requester: friendId, recipient: userId, status: 'accepted' }
            ]
        });
        if (alreadyFriends) {   
            return res.status(400).json(createResponse(false, 'you are already friends'));
        }

        const existingRequest = await Friendship.findOne({
            $or: [
                { requester: userId, recipient: friendId },
                { requester: friendId, recipient: userId }
            ]
        });
        if (existingRequest) {
            return res.status(400).json(createResponse(false, 'duplicate request'));
        }


        // create friendship
        const friendship = await Friendship.create({ requester: userId, recipient: friendId });

        res.status(201).json(createResponse(true, 'Friend requested successfully', friendship));
    } catch (error) {
        res.status(500).json(createResponse(false, error.message));
    }
};

exports.acceptFriendship = async (req, res) => {
    try {
        const { friendshipId } = req.body;

        const friendship = await Friendship.findById(friendshipId);

        if (!friendship) {
            return res.status(404).json(createResponse(false, 'Friendship not found'));
        }

        friendship.status = 'accepted';
        await friendship.save();

        res.status(200).json(createResponse(true, 'Friendship accepted successfully'));
    } catch (error) {
        res.status(500).json(createResponse(false, error.message));
    }
}; 

exports.rejectFriendship = async (req, res) => {
    try {
        const { friendshipId } = req.body;

        const friendship = await Friendship.findById(friendshipId);

        if (!friendship) {
            return res.status(404).json(createResponse(false, 'Friendship not found'));
        }

        await friendship.deleteOne();

        res.status(200).json(createResponse(true, 'Friendship rejected successfully'));
    } catch (error) {
        res.status(500).json(createResponse(false, error.message));
    }
};

exports.getFriendRequests = async (req, res) => {
    try {
        const { userId } = req.user.userId;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json(createResponse(false, 'User not found'));
        }

        const friendRequests = await Friendship.find({ recipient: userId, status: 'pending' });

        res.status(200).json(createResponse(true, 'Friend requests retrieved successfully', friendRequests));
    } catch (error) {
        res.status(500).json(createResponse(false, error.message));
    }
};

exports.getFriends = async (req, res) => {
    try {
        const { userId } = req.user.userId;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json(createResponse(false, 'User not found'));
        }

        const friends = await Friendship.find({
            $or: [
                { requester: userId, status: 'accepted' },
                { recipient: userId, status: 'accepted' }
            ]
        });

        res.status(200).json(createResponse(true, 'Friends retrieved successfully', friends));
    } catch (error) {
        res.status(500).json(createResponse(false, error.message));
    }
};


exports.blockFriend = async (req, res) => {
    try {
        const userId = req.user.userId;
        const friendId = req.body.friendId;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json(createResponse(false, 'User not found'));
        }

        // Check if the friend exists
        const friend = await User.findById(friendId);
        if (!friend) {
            return res.status(404).json(createResponse(false, 'Friend not found'));
        }

        // Find and update any existing friendship to blocked status
        const friendship = await Friendship.findOneAndUpdate(
            {
                $or: [
                    { requester: userId, recipient: friendId },
                    { requester: friendId, recipient: userId }
                ]
            },
            { status: 'blocked', blocker: userId }
        );

        // If no existing friendship, create a new blocked relationship
        if (!friendship) {
            await Friendship.create({
                requester: userId,
                recipient: friendId,
                status: 'blocked',
                blocker: userId
            });
        }

        res.status(200).json(createResponse(true, 'User blocked successfully'));
    } catch (error) {
        res.status(500).json(createResponse(false, error.message));
    }
};

exports.unblockFriend = async (req, res) => {
    try {
        const { friendId } = req.body;
        const userId = req.user.userId;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json(createResponse(false, 'User not found'));
        }

        // Check if the friend exists
        const friend = await User.findById(friendId);
        if (!friend) {
            return res.status(404).json(createResponse(false, 'Friend not found'));
        }

        // Find and update any existing blocked relationship
        const blockedRelationship = await Friendship.findOneAndUpdate(
            {
                $or: [
                    { requester: userId, recipient: friendId, blocker: userId },
                    { requester: friendId, recipient: userId, blocker: userId }
                ]
            },
            { status: 'accepted', blocker: null }
        );

        if (!blockedRelationship) {
            return res.status(404).json(createResponse(false, 'Blocked relationship not found'));
        }

        res.status(200).json(createResponse(true, 'User unblocked successfully'));
    } catch (error) {
        res.status(500).json(createResponse(false, error.message));
    }
};

exports.getBlockedFriends = async (req, res) => {
    try {
        const { userId } = req.user.userId;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json(createResponse(false, 'User not found'));
        }

        const blockedFriends = await Friendship.find({
            blocker: userId,
            status: 'blocked'
        });

        res.status(200).json(createResponse(true, 'Blocked friends retrieved successfully', blockedFriends));
    } catch (error) {
        res.status(500).json(createResponse(false, error.message));
    }
};
