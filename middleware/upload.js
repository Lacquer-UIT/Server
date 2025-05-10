const multer = require('multer');

// Store the file in memory (buffer), not disk
const storage = multer.memoryStorage();

// Optional: filter only image files (jpg, png, etc.)
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit (change if needed)
});

module.exports = upload;