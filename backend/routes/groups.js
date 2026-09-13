const express = require("express");
const router = express.Router();
const Group = require("../models/Group");

// POST /api/groups - Create a group
router.post("/", async (req, res) => {
  try {
    const { name, ownerRegNo, memberRegNos } = req.body;

    if (!ownerRegNo) {
      return res.status(400).json({ success: false, message: "ownerRegNo is required" });
    }

    const members = Array.isArray(memberRegNos) ? memberRegNos : [];
    if (!members.includes(ownerRegNo)) {
      members.push(ownerRegNo);
    }

    const groupName = name && typeof name === "string" && name.trim() ? name.trim() : "Study Group";

    const newGroup = await Group.create({
      name: groupName,
      ownerRegNo,
      memberRegNos: members,
      sharedMaterialIds: [],
    });

    return res.json({
      success: true,
      message: "Group created successfully",
      group: newGroup,
    });
  } catch (error) {
    console.error("Error creating group:", error);
    return res.status(500).json({ success: false, message: "Failed to create group" });
  }
});

// GET /api/groups/:regNo - Get groups for a user
router.get("/:regNo", async (req, res) => {
  try {
    const { regNo } = req.params;

    const groups = await Group.find({
      $or: [{ ownerRegNo: regNo }, { memberRegNos: regNo }],
    });

    return res.json({
      success: true,
      groups,
    });
  } catch (error) {
    console.error("Error fetching groups:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch groups" });
  }
});

// POST /api/groups/:id/share - Share a material to a group
router.post("/:id/share", async (req, res) => {
  try {
    const { id } = req.params;
    const { materialId, regNo } = req.body;

    if (!materialId) {
      return res.status(400).json({ success: false, message: "materialId is required" });
    }

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found" });
    }

    // Check membership if regNo is supplied
    if (regNo && !group.memberRegNos.includes(regNo) && group.ownerRegNo !== regNo) {
      return res.status(403).json({ success: false, message: "Access denied. Only group members can share materials." });
    }

    if (!group.sharedMaterialIds.includes(materialId)) {
      group.sharedMaterialIds.push(materialId);
      await group.save();
    }

    return res.json({
      success: true,
      message: "Material shared successfully",
      group,
    });
  } catch (error) {
    console.error("Error sharing material to group:", error);
    return res.status(500).json({ success: false, message: "Failed to share material to group" });
  }
});

module.exports = router;
