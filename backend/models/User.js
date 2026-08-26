const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  regNo: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  year: { type: Number, required: true, min: 1, max: 4 },
  department: { type: String, required: true },
  email: { type: String, unique: true, sparse: true, required: false },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
