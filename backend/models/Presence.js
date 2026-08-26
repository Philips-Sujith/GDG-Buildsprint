const mongoose = require('mongoose');

const presenceSchema = new mongoose.Schema({
  regNo: { type: String, required: true },
  floor: { type: String, required: true },
  checkinTime: { type: Date, default: Date.now },
  lastPingAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model('Presence', presenceSchema);
