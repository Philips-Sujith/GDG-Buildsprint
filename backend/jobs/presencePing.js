const cron = require("node-cron");
const Presence = require("../models/Presence");
const Notification = require("../models/Notification");

const runPresencePingCheck = async () => {
  try {
    const now = new Date();
    // 5 minutes demo timeout window
    const timeoutWindow = new Date(now.getTime() - 5 * 60 * 1000);

    // 1. Find active presence docs where lastPingAt is older than 5 min & pendingPing is true -> set isActive = false
    const timedOutDocs = await Presence.find({
      isActive: true,
      pendingPing: true,
      lastPingAt: { $lt: timeoutWindow },
    });

    for (const doc of timedOutDocs) {
      doc.isActive = false;
      doc.pendingPing = false;
      await doc.save();
      console.log(`[presencePing] Presence auto-expired for regNo ${doc.regNo} due to ping timeout.`);
    }

    // 2. Find active presence docs that need a new ping
    const activeDocs = await Presence.find({
      isActive: true,
      pendingPing: false,
    });

    for (const doc of activeDocs) {
      doc.pendingPing = true;
      await doc.save();

      // Create notification prompt for user
      await Notification.create({
        regNo: doc.regNo,
        message: "Are you still in the library?",
        type: "presence-ping",
        isRead: false,
      });
      console.log(`[presencePing] Ping prompt issued to active user regNo ${doc.regNo}.`);
    }
  } catch (error) {
    console.error("[presencePing] Error running presence ping job:", error);
  }
};

// Cron: Run every 2 hours
cron.schedule("0 */2 * * *", () => {
  runPresencePingCheck();
});

// Demo simulator: check for pending timeouts every 30 seconds
setInterval(() => {
  runPresencePingCheck();
}, 30 * 1000);

module.exports = { runPresencePingCheck };
