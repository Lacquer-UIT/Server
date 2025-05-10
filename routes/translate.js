const express = require("express");
const response = require("../dto");
const apiLimiter = require('../middleware/rateLimiter');

const router = express.Router();
const { Translate } = require('@google-cloud/translate').v2;

// Initialize Google Translate client with credentials
let translateClient;
try {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    // Use credentials from environment variable string
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    translateClient = new Translate({ credentials });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Use credentials from file path
    translateClient = new Translate({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });
  } else {
    throw new Error('No Google Cloud credentials found');
  }
} catch (error) {
  console.error('Error initializing Google Translate client:', error);
  throw error;
}

// Apply rate limiter to all routes in this router
router.use(apiLimiter);

/**
 * @route POST /translate
 * @desc Translate text from source language to target language
 * @access Public
 */
router.post('/', async (req, res) => {
  try {
    const { text, source, target } = req.body;

    // Validate request body
    if (!text) {
      return res.status(400).json(response(false, 'Text to translate is required'));
    }
    
    if (!target) {
      return res.status(400).json(response(false, 'Target language is required'));
    }

    // Translate the text
    const [translation] = await translateClient.translate(text, {
      from: source || 'auto', // If source is not provided, detect language
      to: target
    });

    return res.status(200).json(response(true, 'Translation successful', {
      originalText: text,
      translatedText: translation,
      sourceLanguage: source || 'auto',
      targetLanguage: target
    }));
    
  } catch (error) {
    console.error('Translation error:', error);
    return res.status(500).json(response(false, 'Error translating text: ' + error.message));
  }
});


module.exports = router;