const express = require('express');
const router = express.Router();
const response = require("../dto");

const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');

// Use multer to handle the incoming form data, but we won't store it
const upload = multer(); // Use multer without any storage option

router.post('/', upload.single('image'), async (req, res) => {
  // Check if the file exists in the request
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded' });
  }

  // Create a FormData object
  const form = new FormData();
  
  // Append the image buffer directly from memory to FormData
  form.append('image', req.file.buffer, { filename: 'image.jpg' });

  try {
    // Send the image to the Python backend for classification
    const response = await axios.post('http://python-service:3030/classify', form, {
      headers: form.getHeaders()
    });

    // Return the response from Python service, adding a success field based on confidence
    res.json({ ...response.data, success: response.data.confidence >= 80 });
    const ans = response.data.confidence >= 80 ? true : false;
    res.json(response(ans, ans ? "Success" : "Failed", response.data.landmark))
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not classify image' });
  }
});

module.exports = router;