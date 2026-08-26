const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema({
  ownerRegNo: { type: String, required: true },
  memberRegNos: { type: [String], default: [] },
  sharedMaterialIds: { type: [String], default: [] },
});

module.exports = mongoose.model("Group", groupSchema);
