const express = require("express");
const router = express.Router();
const Presence = require("../models/Presence");
const Notification = require("../models/Notification");

const normalizeRoomName = (rawName) => {
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

// POST /api/presence/checkin
router.post("/checkin", async (req, res) => {
  try {
    const { regNo, floor } = req.body;
    if (!regNo) {
      return res.status(400).json({ success: false, message: "regNo is required" });
    }

    const cleanRegNo = String(regNo).trim();
    const targetRoom = normalizeRoomName(floor);
    const now = new Date();

    const existing = await Presence.findOne({ regNo: cleanRegNo });

    // 1. If user is already active in the exact same room: no duplicate, no extra count
    if (existing && existing.isActive && existing.floor === targetRoom) {
      existing.lastPingAt = now;
      existing.pendingPing = false;
      await existing.save();

      return res.json({
        success: true,
        message: `Already checked in to ${targetRoom}`,
        presence: existing,
        noChange: true,
      });
    }

    // 2. If user is already active and switching rooms: room transfer (old -1, new +1, total unchanged)
    if (existing && existing.isActive && existing.floor !== targetRoom) {
      const oldRoom = existing.floor;
      existing.floor = targetRoom;
      existing.lastPingAt = now;
      existing.pendingPing = false;
      await existing.save();

      // Dismiss any stale ping notifications on checkin
      await Notification.updateMany(
        { regNo: cleanRegNo, type: "presence-ping", isRead: false },
        { $set: { isRead: true } }
      );

      return res.json({
        success: true,
        message: `Transferred from ${oldRoom} to ${targetRoom}`,
        presence: existing,
        changedRoom: true,
      });
    }

    // 3. New check-in: activate presence (+1 room, +1 total)
    const presenceDoc = await Presence.findOneAndUpdate(
      { regNo: cleanRegNo },
      {
        regNo: cleanRegNo,
        floor: targetRoom,
        checkinTime: now,
        lastPingAt: now,
        isActive: true,
        pendingPing: false,
      },
      { upsert: true, returnDocument: 'after' }
    );

    // Dismiss any stale ping notifications on checkin
    await Notification.updateMany(
      { regNo: cleanRegNo, type: "presence-ping", isRead: false },
      { $set: { isRead: true } }
    );

    return res.json({
      success: true,
      message: `Successfully checked in to ${targetRoom}`,
      presence: presenceDoc,
    });
  } catch (error) {
    console.error("Error during check-in:", error);
    return res.status(500).json({ success: false, message: "Check-in failed" });
  }
});

// POST /api/presence/checkout
router.post("/checkout", async (req, res) => {
  try {
    const { regNo } = req.body;
    if (!regNo) {
      return res.status(400).json({ success: false, message: "regNo is required" });
    }

    const cleanRegNo = String(regNo).trim();
    const presenceDoc = await Presence.findOneAndUpdate(
      { regNo: cleanRegNo },
      {
        isActive: false,
        pendingPing: false,
      },
      { returnDocument: 'after' }
    );

    // Dismiss any active ping notifications
    await Notification.updateMany(
      { regNo: cleanRegNo, type: "presence-ping", isRead: false },
      { $set: { isRead: true } }
    );

    return res.json({
      success: true,
      message: "Successfully checked out of library",
      presence: presenceDoc || { regNo: cleanRegNo, isActive: false, pendingPing: false },
    });
  } catch (error) {
    console.error("Error during check-out:", error);
    return res.status(500).json({ success: false, message: "Check-out failed" });
  }
});

// POST /api/presence/ping-response
router.post("/ping-response", async (req, res) => {
  try {
    const { regNo, stillHere } = req.body;
    if (!regNo) {
      return res.status(400).json({ success: false, message: "regNo is required" });
    }

    const cleanRegNo = String(regNo).trim();
    const now = new Date();
    const isStillActive = Boolean(stillHere);

    const presenceDoc = await Presence.findOneAndUpdate(
      { regNo: cleanRegNo },
      {
        isActive: isStillActive,
        pendingPing: false,
        ...(isStillActive ? { lastPingAt: now } : {}),
      },
      { returnDocument: 'after' }
    );

    // Immediately mark all unread presence-ping notifications as read for this student
    await Notification.updateMany(
      { regNo: cleanRegNo, type: "presence-ping", isRead: false },
      { $set: { isRead: true } }
    );

    return res.json({
      success: true,
      isActive: presenceDoc ? presenceDoc.isActive : false,
      presence: presenceDoc,
    });
  } catch (error) {
    console.error("Error responding to ping:", error);
    return res.status(500).json({ success: false, message: "Failed to submit ping response" });
  }
});

// GET /api/presence/:regNo
router.get("/:regNo", async (req, res) => {
  try {
    const cleanRegNo = String(req.params.regNo).trim();
    const presenceDoc = await Presence.findOne({ regNo: cleanRegNo });
    return res.json({
      success: true,
      presence: presenceDoc || { regNo: cleanRegNo, isActive: false, pendingPing: false },
    });
  } catch (error) {
    console.error("Error fetching presence:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch presence status" });
  }
});

module.exports = router;
