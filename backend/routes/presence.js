const express = require("express");
const router = express.Router();
const Presence = require("../models/Presence");

// POST /api/presence/checkin
router.post("/checkin", async (req, res) => {
  try {
    const { regNo, floor } = req.body;
    if (!regNo) {
      return res.status(400).json({ success: false, message: "regNo is required" });
    }

    const now = new Date();
    const presenceDoc = await Presence.findOneAndUpdate(
      { regNo },
      {
        regNo,
        floor: floor || "1st Floor",
        checkinTime: now,
        lastPingAt: now,
        isActive: true,
        pendingPing: false,
      },
      { upsert: true, new: true }
    );

    return res.json({
      success: true,
      message: "Successfully checked in to library",
      presence: presenceDoc,
    });
  } catch (error) {
    console.error("Error during check-in:", error);
    return res.status(500).json({ success: false, message: "Check-in failed" });
  }
});

// POST /api/presence/ping-response
router.post("/ping-response", async (req, res) => {
  try {
    const { regNo, stillHere } = req.body;
    if (!regNo) {
      return res.status(400).json({ success: false, message: "regNo is required" });
    }

    const now = new Date();
    const isStillActive = Boolean(stillHere);

    const presenceDoc = await Presence.findOneAndUpdate(
      { regNo },
      {
        isActive: isStillActive,
        pendingPing: false,
        ...(isStillActive ? { lastPingAt: now } : {}),
      },
      { new: true }
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
    const { regNo } = req.params;
    const presenceDoc = await Presence.findOne({ regNo });
    return res.json({
      success: true,
      presence: presenceDoc || { regNo, isActive: false, pendingPing: false },
    });
  } catch (error) {
    console.error("Error fetching presence:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch presence status" });
  }
});

module.exports = router;
