const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Support CLOUDINARY_URL or individual credentials
if (process.env.CLOUDINARY_URL) {
  // Cloudinary SDK automatically parses CLOUDINARY_URL
} else if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// Helper to save buffer locally to uploads folder
const saveLocalUpload = (file) => {
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  const ext = path.extname(file.originalname) || '.png';
  const fileName = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 9)}${ext}`;
  const filePath = path.join(uploadsDir, fileName);
  fs.writeFileSync(filePath, file.buffer);
  return `/uploads/${fileName}`;
};

// Generic file upload — reusable by all modules
router.post('/', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const hasCloudinary = Boolean(
      process.env.CLOUDINARY_URL ||
      (process.env.CLOUDINARY_CLOUD_NAME &&
       process.env.CLOUDINARY_API_KEY &&
       process.env.CLOUDINARY_API_SECRET)
    );

    if (hasCloudinary) {
      const { Readable } = require('stream');
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'smart-library' },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload failed, falling back to local storage:', error.message);
            try {
              const localUrl = saveLocalUpload(req.file);
              return res.json({ success: true, url: localUrl, fileUrl: localUrl });
            } catch (localErr) {
              return res.status(500).json({ success: false, error: error.message });
            }
          }
          return res.json({ success: true, url: result.secure_url, fileUrl: result.secure_url });
        }
      );

      const readable = new Readable();
      readable.push(req.file.buffer);
      readable.push(null);
      readable.pipe(uploadStream);
    } else {
      // Cloudinary credentials not configured — use local uploads directory
      const localUrl = saveLocalUpload(req.file);
      return res.json({ success: true, url: localUrl, fileUrl: localUrl });
    }
  } catch (error) {
    console.error('Upload route error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

