const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { sequelize } = require('../../db');

// GET all notifications for the logged-in user
router.get('/', protect, async (req, res) => {
    try {
        const notifications = await sequelize.models.Notification.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']]
        });
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PUT to mark a specific notification as read
router.put('/:id/read', protect, async (req, res) => {
    try {
        const notification = await sequelize.models.Notification.findOne({
            where: { id: req.params.id, userId: req.user.id }
        });

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        notification.isRead = true;
        await notification.save();
        res.json(notification);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// PUT to mark all notifications as read
router.put('/read-all', protect, async (req, res) => {
    try {
        await sequelize.models.Notification.update(
            { isRead: true },
            { where: { userId: req.user.id, isRead: false } }
        );
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;
