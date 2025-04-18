const express = require('express');
const router = express.Router();

const multer = require('multer');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

// Setup multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image!'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

router.post('/recognize', upload.single('image'), async (req, res) => {
  const imagePath = req.file.path;

  const form = new FormData();
  form.append('image', fs.createReadStream(imagePath));

  try {
    const response = await axios.post('http://localhost:3030/classify', form, {
      headers: form.getHeaders()
    });

    fs.unlinkSync(imagePath); // clean up
    res.json({ ...response.data, success: response.data.confidence >= 95 });

  } catch (err) {
    fs.unlinkSync(imagePath);
    console.error(err);
    res.status(500).json({ error: 'Could not classify image' });
  }
});

module.exports = router;