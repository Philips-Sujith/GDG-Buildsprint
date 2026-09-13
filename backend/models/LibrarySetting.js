const mongoose = require('mongoose');

const librarySettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'occupancy' },
    baseCount: { type: Number, default: 38 },
    roomBaseCounts: {
      'First Floor': { type: Number, default: 8 },
      'Second Floor': { type: Number, default: 7 },
      'Reading Room': { type: Number, default: 9 },
      'Discussion Room': { type: Number, default: 4 },
      'Study Room': { type: Number, default: 6 },
      'Reference Room': { type: Number, default: 4 },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('LibrarySetting', librarySettingSchema);
