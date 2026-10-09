
const express = require('express');
const router = express.Router();
const { protect, admin } = require('../../middleware/auth');
const { sequelize } = require('../../db');
const { broadcast } = require('../utils/sse');

// GET all rooms
router.get('/', async (req, res) => {
  try {
    const where = req.query.all === 'true' ? {} : { isActive: true };
    const rooms = await sequelize.models.Room.findAll({
      where,
      order: [['roomNumber', 'ASC']]
    });
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET single room
router.get('/:id', async (req, res) => {
  try {
    const room = await sequelize.models.Room.findByPk(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room node not found.' });
    res.json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST create room (Admin only)
router.post('/', protect, admin, async (req, res) => {
  try {
    const { roomNumber, name, type, capacity, baseTariff, isActive, description } = req.body;
    if (!roomNumber) return res.status(400).json({ message: 'Room number is required.' });

    const existing = await sequelize.models.Room.findOne({ where: { roomNumber } });
    if (existing) return res.status(409).json({ message: `Room ${roomNumber} already exists in database.` });

    const room = await sequelize.models.Room.create({
      roomNumber: String(roomNumber),
      name: name || `Room ${roomNumber}`,
      type: type || 'AC Room',
      capacity: capacity ? Number(capacity) : 2,
      baseTariff: baseTariff ? Number(baseTariff) : 500.00,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      description
    });

    broadcast('ROOMS_CHANGED', { action: 'CREATED', room });
    res.status(201).json(room);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT update room (Admin only)
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const room = await sequelize.models.Room.findByPk(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found.' });

    const { roomNumber, name, type, capacity, baseTariff, isActive, description } = req.body;
    if (roomNumber && String(roomNumber) !== String(room.roomNumber)) {
      const existing = await sequelize.models.Room.findOne({ where: { roomNumber: String(roomNumber) } });
      if (existing) return res.status(409).json({ message: `Room ${roomNumber} is already in use.` });
      room.roomNumber = String(roomNumber);
    }

    if (name !== undefined) room.name = name;
    if (type !== undefined) room.type = type;
    if (capacity !== undefined) room.capacity = Number(capacity);
    if (baseTariff !== undefined) room.baseTariff = Number(baseTariff);
    if (isActive !== undefined) room.isActive = Boolean(isActive);
    if (description !== undefined) room.description = description;

    await room.save();
    broadcast('ROOMS_CHANGED', { action: 'UPDATED', room });
    res.json(room);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE room (Admin only)
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const room = await sequelize.models.Room.findByPk(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found.' });

    await room.destroy();
    broadcast('ROOMS_CHANGED', { action: 'DELETED', roomId: req.params.id });
    res.json({ message: `Room ${room.roomNumber} removed successfully.` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
