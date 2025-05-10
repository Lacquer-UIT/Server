const express = require('express');
const router = express.Router();
const multer = require('multer');
const { ImageAnnotatorClient } = require('@google-cloud/vision');
const axios = require('axios');
const response = require('../dto');
const authMiddleware = require('../middleware/auth');
const path = require('path');
const apiLimiter = require('../middleware/rateLimiter');

// Use the upload middleware from middleware/upload.js
const upload = require('../middleware/upload');

// Initialize Google Vision client with credentials from either environment variable or file
let visionClient;
try {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    // Use credentials from environment variable string
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    visionClient = new ImageAnnotatorClient({ credentials });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Use credentials from file path
    visionClient = new ImageAnnotatorClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });
  } else {
    throw new Error('No Google Cloud credentials found');
  }
} catch (error) {
  console.error('Error initializing Google Vision client:', error);
  throw error;
}

// Apply rate limiter to all routes in this router
router.use(apiLimiter);

router.post('/landmark', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    // Check if image was uploaded
    if (!req.file) {
      return res.status(400).json(response(false, 'No image uploaded'));
    }

    // Get user coordinates from request body
    const { latitude, longitude } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json(response(false, 'User coordinates are required'));
    }

    // Detect landmarks in the image
    const [result] = await visionClient.landmarkDetection({
      image: { content: req.file.buffer }
    });

    const landmarks = result.landmarkAnnotations;
    
    if (!landmarks || landmarks.length === 0) {
      return res.status(404).json(response(false, 'No landmarks detected in the image'));
    }

    // Filter landmarks with confidence > 50%
    const validLandmarks = landmarks.filter(landmark => landmark.score >= 0.5);
    
    if (validLandmarks.length === 0) {
      return res.status(404).json(response(false, 'No landmarks detected with sufficient confidence'));
    }

    // Check if any landmark is within 5km radius
    const landmarksWithinRadius = [];
    
    for (const landmark of validLandmarks) {
      if (landmark.locations && landmark.locations.length > 0) {
        const landmarkLat = landmark.locations[0].latLng.latitude;
        const landmarkLng = landmark.locations[0].latLng.longitude;
        
        // Calculate distance using Haversine formula
        const distance = calculateDistance(
          parseFloat(latitude), 
          parseFloat(longitude), 
          landmarkLat, 
          landmarkLng
        );
        
        if (distance <= 5) { // 5km radius
          landmarksWithinRadius.push({
            name: landmark.description,
            confidence: (landmark.score * 100).toFixed(2) + '%',
            distance: distance.toFixed(2) + ' km',
            location: {
              latitude: landmarkLat,
              longitude: landmarkLng
            }
          });
        }
      }
    }
    
    if (landmarksWithinRadius.length === 0) {
      return res.status(404).json(response(false, 'No landmarks found within 5km radius'));
    }
    
    return res.status(200).json(response(true, 'Landmarks detected successfully', landmarksWithinRadius));
    
  } catch (error) {
    console.error('Error detecting landmarks:', error);
    return res.status(500).json(response(false, 'Error processing image: ' + error.message));
  }
});

// Route for classifying food and objects in an image
router.post('/objects', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json(response(false, 'No image file provided'));
    }

    // Perform label detection on the image buffer
    const [result] = await visionClient.labelDetection({
      image: { content: req.file.buffer }
    });
    
    const labels = result.labelAnnotations;

    if (!labels || labels.length === 0) {
      return res.status(404).json(response(false, 'No objects detected in the image'));
    }

    // Dictionary of Vietnamese foods and objects with descriptions
    const itemDictionary = {
      // Foods
      "Pho": "Vietnamese noodle soup with beef or chicken",
      "Bun Bo Hue": "Spicy beef noodle soup from Hue",
      "Bun Rieu": "Crab noodle soup with tomato broth",
      "Mi Quang": "Turmeric noodles from Quang Nam province",
      "Hu Tieu": "Southern Vietnamese clear noodle soup",
      "Banh Mi": "Vietnamese sandwich with French baguette",
      "Com Tam": "Broken rice dish with grilled pork",
      "Goi Cuon": "Fresh spring rolls with rice paper",
      "Cha Gio": "Fried spring rolls",
      "Banh Trang Nuong": "Grilled rice paper with toppings",
      "Banh Trang Tron": "Rice paper salad with mixed ingredients",
      "Xien Que Nuong": "Grilled skewers",
      "Che": "Sweet Vietnamese dessert soup",
      "Ca Phe Sua": "Vietnamese coffee with condensed milk",
      "Sam Dua": "Coconut jelly dessert",
      "Nuoc Mia": "Sugarcane juice",
      
      // Objects
      "Non La": "Conical leaf hat traditional to Vietnam",
      "Chieu Coi": "Traditional Vietnamese sleeping mat",
      "Ghe Nhua Do": "Red plastic stool common in street food stalls",
      "Binh Nuoc Duy Tan": "Plastic water container brand",
      "Li Xi": "Red envelope for lucky money during Tet",
      "Bep Than To Ong": "Clay charcoal stove",
      "Xe Cub": "Honda Cub motorbike popular in Vietnam",
      "Ban Tho": "Vietnamese ancestral altar for worship"
    };

    // Mapping of descriptions to keys
    const descriptionToKey = {
      "vietnamese noodle soup": "Pho",
      "spicy beef noodle": "Bun Bo Hue",
      "crab noodle soup": "Bun Rieu",
      "turmeric noodles": "Mi Quang",
      "clear noodle soup": "Hu Tieu",
      "vietnamese sandwich": "Banh Mi",
      "broken rice": "Com Tam",
      "fresh spring rolls": "Goi Cuon",
      "fried spring rolls": "Cha Gio",
      "grilled rice paper": "Banh Trang Nuong",
      "rice paper salad": "Banh Trang Tron",
      "grilled skewers": "Xien Que Nuong",
      "sweet dessert soup": "Che",
      "vietnamese coffee": "Ca Phe Sua",
      "coconut jelly": "Sam Dua",
      "sugarcane juice": "Nuoc Mia",
      
      "conical hat": "Non La",
      "leaf hat": "Non La",
      "sleeping mat": "Chieu Coi",
      "red plastic stool": "Ghe Nhua Do",
      "plastic water container": "Binh Nuoc Duy Tan",
      "red envelope": "Li Xi",
      "lucky money": "Li Xi",
      "clay stove": "Bep Than To Ong",
      "charcoal stove": "Bep Than To Ong",
      "honda cub": "Xe Cub",
      "motorbike": "Xe Cub",
      "ancestral altar": "Ban Tho",
      "shrine": "Ban Tho"
    };

    // Find the best match with highest confidence
    let bestMatch = null;
    let highestConfidence = 0;

    for (const label of labels) {
      const labelLower = label.description.toLowerCase();
      let matched = false;
      let matchedKey = null;
      
      // Try to match with description dictionary
      for (const [desc, key] of Object.entries(descriptionToKey)) {
        if (labelLower.includes(desc)) {
          matchedKey = key;
          matched = true;
          break;
        }
      }
      
      // If no match in descriptions, try direct match with keys
      if (!matched) {
        for (const key of Object.keys(itemDictionary)) {
          if (labelLower.includes(key.toLowerCase())) {
            matchedKey = key;
            matched = true;
            break;
          }
        }
      }
      
      if (matched && matchedKey && label.score > highestConfidence) {
        highestConfidence = label.score;
        bestMatch = {
          object: matchedKey,
          confidence: (label.score * 100).toFixed(2) + '%'
        };
      }
    }

    // If no match found in our dictionary, return unknown
    if (!bestMatch) {
      bestMatch = {
        object: "Unknown",
        confidence: "N/A"
      };
    }

    return res.status(200).json(response(true, 'Objects detected successfully', bestMatch));
    
  } catch (error) {
    console.error('Error detecting objects:', error);
    return res.status(500).json(response(false, 'Error processing image: ' + error.message));
  }
});


// Haversine formula to calculate distance between two coordinates in kilometers
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in km
  return distance;
}

module.exports = router;
