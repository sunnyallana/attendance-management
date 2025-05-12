const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');

// Get unread notifications for parent
router.get('/', auth(['parent']), async (req, res) => {
  try {
    const notifications = await Notification.find({
      parentId: req.user._id,
      isRead: false
    })
      .populate('studentId', 'firstName lastName')
      .populate('attendanceId', 'status date entryTime exitTime remarks')
      .sort({ createdAt: -1 });
    
    res.json(notifications);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Mark notification as read
router.patch('/:id/mark-read', auth(['parent']), async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, parentId: req.user._id },
      { isRead: true },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json(notification);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;