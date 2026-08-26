const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");

// GET /api/notifications/:regNo - Return unread notifications for student (deduplicated)
router.get("/:regNo", async (req, res) => {
  try {
    const { regNo } = req.params;

    const notifications = await Notification.find({
      regNo,
      isRead: false,
    })
      .sort({ createdAt: -1 })
      .select("_id message type createdAt isRead");

    // Deduplicate in memory just in case multiple identical messages exist
    const seen = new Set();
    const uniqueNotifications = [];
    for (const notif of notifications) {
      const key = `${notif.message}_${notif.type}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueNotifications.push(notif);
      }
    }

    return res.json(uniqueNotifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch notifications" });
  }
});

// POST /api/notifications/:id/read - Mark specific notification as read
router.post("/:id/read", async (req, res) => {
  try {
    const { id } = req.params;
    await Notification.findByIdAndUpdate(id, { isRead: true });
    return res.json({ success: true, message: "Notification dismissed" });
  } catch (error) {
    console.error("Error marking notification read:", error);
    return res.status(500).json({ success: false, message: "Failed to dismiss notification" });
  }
});

// POST /api/notifications/dismiss - Dismiss notifications by message and regNo
router.post("/dismiss", async (req, res) => {
  try {
    const { regNo, message, type } = req.body;
    const query = { isRead: false };
    if (regNo) query.regNo = regNo;
    if (message) query.message = message;
    if (type) query.type = type;

    await Notification.updateMany(query, { isRead: true });
    return res.json({ success: true, message: "Notifications dismissed successfully" });
  } catch (error) {
    console.error("Error dismissing notifications:", error);
    return res.status(500).json({ success: false, message: "Failed to dismiss notifications" });
  }
});

module.exports = router;
