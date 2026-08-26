const express = require('express');
const Grievance = require('../models/Grievance');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { bookName, coverPhotoUrl, reasonPhotoUrl, reasonText, shelfCode } = req.body;
    const grievance = new Grievance({
      regNo: req.user.regNo,
      bookName,
      coverPhotoUrl,
      reasonPhotoUrl,
      reasonText,
      shelfCode
    });
    await grievance.save();
    res.json({ grievanceId: grievance._id, message: 'Grievance submitted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
