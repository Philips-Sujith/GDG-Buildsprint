const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  regNo: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: "due-alert" },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Notification", notificationSchema);
