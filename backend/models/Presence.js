const mongoose = require('mongoose');

const presenceSchema = new mongoose.Schema(
  {
    regNo: { type: String, required: true, unique: true },
    floor: { type: String, required: true, default: '1st Floor' },
    checkinTime: { type: Date, default: Date.now },
    lastPingAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    pendingPing: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Presence', presenceSchema);
