const express = require('express');
const Presence = require('../models/Presence');
const LibrarySetting = require('../models/LibrarySetting');
const router = express.Router();

const normalizeFloorName = (rawName) => {
  if (!rawName) return 'First Floor';
  const lower = String(rawName).trim().toLowerCase();
  if (lower.includes('second') || lower.includes('2nd') || lower === 'floor 2') return 'Second Floor';
  if (lower.includes('first') || lower.includes('1st') || lower === 'floor 1') return 'First Floor';
  if (lower.includes('reading')) return 'Reading Room';
  if (lower.includes('discussion')) return 'Discussion Room';
  if (lower.includes('study')) return 'Study Room';
  if (lower.includes('reference')) return 'Reference Room';
  return 'First Floor';
};

const FIXED_ROOMS = [
  'First Floor',
  'Second Floor',
  'Reading Room',
  'Discussion Room',
  'Study Room',
  'Reference Room',
];

const DEFAULT_ROOM_BASE = {
  'First Floor': 8,
  'Second Floor': 7,
  'Reading Room': 9,
  'Discussion Room': 4,
  'Study Room': 6,
  'Reference Room': 4,
};

const getOccupancyHandler = async (req, res) => {
  try {
    // 1. Fetch or initialize persistent base occupancy (Default: 38 distributed)
    let setting = await LibrarySetting.findOne({ key: 'occupancy' });
    if (!setting) {
      setting = await LibrarySetting.create({
        key: 'occupancy',
        baseCount: 38,
        roomBaseCounts: DEFAULT_ROOM_BASE,
      });
    } else if (
      !setting.roomBaseCounts ||
      typeof setting.roomBaseCounts['First Floor'] !== 'number'
    ) {
      setting.roomBaseCounts = DEFAULT_ROOM_BASE;
      await setting.save();
    }

    const baseCount = typeof setting.baseCount === 'number' ? setting.baseCount : 38;
    const roomBase = setting.roomBaseCounts || DEFAULT_ROOM_BASE;

    // 2. Fetch active application check-ins
    const activePresences = await Presence.find({ isActive: true }).lean();

    const activeCheckInsByRoom = {
      'First Floor': 0,
      'Second Floor': 0,
      'Reading Room': 0,
      'Discussion Room': 0,
      'Study Room': 0,
      'Reference Room': 0,
    };

    const countedRegNos = new Set();

    activePresences.forEach((doc) => {
      const regNoKey = doc.regNo ? String(doc.regNo).trim().toLowerCase() : null;
      if (!regNoKey || countedRegNos.has(regNoKey)) {
        return;
      }
      countedRegNos.add(regNoKey);

      const room = normalizeFloorName(doc.floor);
      if (activeCheckInsByRoom[room] !== undefined) {
        activeCheckInsByRoom[room] += 1;
      } else {
        activeCheckInsByRoom['First Floor'] += 1;
      }
    });

    const activeCheckIns = countedRegNos.size;

    // 3. Compute displayed room count = persistent baseline room count + active application check-ins in that room
    const displayedRooms = {};
    FIXED_ROOMS.forEach((room) => {
      const baseForRoom =
        typeof roomBase[room] === 'number' ? roomBase[room] : DEFAULT_ROOM_BASE[room];
      displayedRooms[room] = baseForRoom + (activeCheckInsByRoom[room] || 0);
    });

    const total = baseCount + activeCheckIns;

    return res.json({
      success: true,
      baseCount,
      activeCheckIns,
      total,
      rooms: displayedRooms,
      byFloor: displayedRooms,
      baseRoomCounts: roomBase,
      activeCheckInsByRoom,
    });
  } catch (error) {
    console.error('Error fetching library count:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

router.get('/count', getOccupancyHandler);
router.get('/occupancy', getOccupancyHandler);

module.exports = router;
