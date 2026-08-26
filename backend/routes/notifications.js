const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");

// GET /api/notifications/:regNo - Return unread notifications for student
router.get("/:regNo", async (req, res) => {
  try {
    const { regNo } = req.params;

    const notifications = await Notification.find({
      regNo,
      isRead: false,
    })
      .sort({ createdAt: -1 })
      .select("message type createdAt isRead");

    return res.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch notifications" });
  }
});

module.exports = router;
