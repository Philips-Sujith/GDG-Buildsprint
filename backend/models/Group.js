const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema({
  name: { type: String, trim: true, default: "Study Group" },
  ownerRegNo: { type: String, required: true },
  memberRegNos: { type: [String], default: [] },
  sharedMaterialIds: { type: [String], default: [] },
});

module.exports = mongoose.model("Group", groupSchema);
