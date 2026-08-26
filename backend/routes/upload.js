const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Generic file upload — reusable by all modules
router.post('/', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'smart-library' },
      (error, result) => {
        if (error) return res.status(500).json({ error: error.message });
        res.json({ url: result.secure_url });
      }
    );

    // Pipe the buffer directly without streamifier
    const { Readable } = require('stream');
    const readable = new Readable();
    readable.push(req.file.buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
