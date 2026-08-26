const mongoose = require('mongoose');

const grievanceSchema = new mongoose.Schema({
  regNo: { type: String, required: true },
  bookName: { type: String, required: true },
  coverPhotoUrl: { type: String, required: true },
  reasonPhotoUrl: { type: String, required: true },
  reasonText: { type: String, required: true },
  shelfCode: { type: String, required: true },
  status: { type: String, default: 'pending' },
  submittedDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Grievance', grievanceSchema);
