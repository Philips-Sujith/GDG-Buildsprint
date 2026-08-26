const mongoose = require("mongoose");

const borrowSchema = new mongoose.Schema({
  regNo: { type: String, required: true },
  bookId: { type: String, required: true },
  borrowDate: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },
  fineAmount: { type: Number, default: 0 },
  isPaid: { type: Boolean, default: false },
  returnedDate: { type: Date, default: null },
});

module.exports = mongoose.model("Borrow", borrowSchema);
