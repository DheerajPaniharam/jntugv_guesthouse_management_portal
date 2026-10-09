const express = require('express');
const router = express.Router();
const { protect, admin } = require('../../middleware/auth');
const { sequelize } = require('../../db');

// GET all audit logs (Admin only)
router.get('/', protect, admin, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 200;
    const offset = (page - 1) * limit;

    const logs = await sequelize.models.AuditLog.findAll({
      order: [['timestamp', 'DESC']],
      limit,
      offset
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST new audit log
router.post('/', protect, async (req, res) => {
  try {
    const logData = {
      ...req.body,
      actorId: req.user.id || req.body.actorId || 'SYSTEM',
      actorName: req.user.name || req.body.actorName || 'System User',
      actorRole: req.user.role || req.body.actorRole || 'System',
      timestamp: new Date()
    };
    const log = await sequelize.models.AuditLog.create(logData);
    res.status(201).json(log);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// GET audit logs for specific target
router.get('/target/:targetId', protect, async (req, res) => {
  try {
    const logs = await sequelize.models.AuditLog.findAll({
      where: { targetId: req.params.targetId },
      order: [['timestamp', 'DESC']]
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
