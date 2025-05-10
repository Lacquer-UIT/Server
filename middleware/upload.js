const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const createResponse = require('../dto');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

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
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Upload to Cloudinary with 720p resolution cap and 1:1 aspect ratio
const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    // Convert buffer to base64 string for Cloudinary upload
    const base64String = buffer.toString('base64');
    const dataURI = `data:image/jpeg;base64,${base64String}`;
    
    cloudinary.uploader.upload(
      dataURI,
      {
        folder: 'uploads',
        transformation: [
          { width: 720, height: 720, crop: 'crop' } // 720x720 with 1:1 aspect ratio
        ]
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
  });
};

// Middleware to handle file upload to Cloudinary
const handleUpload = async (req, res, next) => {
  try {
    if (!req.file) {
      return next();
    }
    
    const result = await uploadToCloudinary(req.file.buffer);
    req.uploadedFile = result;
    next();
  } catch (error) {
    return res.status(500).json(createResponse(false, `Upload failed: ${error.message}`));
  }
};

// Fetch image from Cloudinary
const fetchFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.api.resource(publicId);
    return result;
  } catch (error) {
    throw new Error(`Failed to fetch image: ${error.message}`);
  }
};

module.exports = { upload, handleUpload, uploadToCloudinary, fetchFromCloudinary };