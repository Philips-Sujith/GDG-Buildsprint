const cron = require("node-cron");
const Presence = require("../models/Presence");
const Notification = require("../models/Notification");

const runPresencePingCheck = async () => {
  try {
    const now = new Date();
    // 2-hour window before asking "Are you still in the library?"
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    // 15-minute grace period after pendingPing is issued before auto-expiring presence
    const pingTimeoutWindow = new Date(now.getTime() - 15 * 60 * 1000);

    // 1. Auto-expire presence if ping was issued > 15 minutes ago with no response
    const timedOutDocs = await Presence.find({
      isActive: true,
      pendingPing: true,
      lastPingAt: { $lt: pingTimeoutWindow },
    });

    for (const doc of timedOutDocs) {
      doc.isActive = false;
      doc.pendingPing = false;
      await doc.save();
      console.log(`[presencePing] Presence auto-expired for regNo ${doc.regNo} due to timeout.`);
    }

    // 2. Find active presence docs where user checked in >= 2 hours ago and has not been prompted yet
    const docsDueForPing = await Presence.find({
      isActive: true,
      pendingPing: false,
      lastPingAt: { $lte: twoHoursAgo },
    });

    for (const doc of docsDueForPing) {
      doc.pendingPing = true;
      await doc.save();

      // Check if unread ping notification already exists before creating
      const existingPing = await Notification.findOne({
        regNo: doc.regNo,
        type: "presence-ping",
        isRead: false,
      });

      if (!existingPing) {
        await Notification.create({
          regNo: doc.regNo,
          message: "Are you still in the library?",
          type: "presence-ping",
          isRead: false,
        });
        console.log(`[presencePing] 2-hour ping reminder issued to regNo ${doc.regNo}.`);
      }
    }
  } catch (error) {
    console.error("[presencePing] Error running presence ping job:", error);
  }
};

// Cron: Run periodic check every 5 minutes
cron.schedule("*/5 * * * *", () => {
  runPresencePingCheck();
});

module.exports = { runPresencePingCheck };
