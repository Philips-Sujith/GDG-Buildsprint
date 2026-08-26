const express = require('express');
const Presence = require('../models/Presence');
const router = express.Router();

router.get('/count', async (req, res) => {
  try {
    const total = await Presence.countDocuments({ isActive: true });
    const byFloorData = await Presence.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$floor', count: { $sum: 1 } } }
    ]);
    const byFloor = {};
    byFloorData.forEach(item => {
      byFloor[item._id] = item.count;
    });
    res.json({ total, byFloor });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
