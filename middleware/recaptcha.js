const axios = require('axios');
const createResponse = require('../dto');
require('dotenv').config();

const verifyRecaptcha = async (req, res, next) => {
  try {
    // Check for client platform using header
    const platform = req.headers['x-platform'] || '';
    
    // Skip reCAPTCHA verification for mobile clients
    if (platform === 'android' || platform === 'ios') {
      return next();
    }
    
    const { recaptchaToken } = req.body;

    // If no token was provided
    if (!recaptchaToken) {
      return res.status(400).json(createResponse(false, 'reCAPTCHA token is required'));
    }

    // Check if CAPTCHA_SECRET is set
    if (!process.env.CAPTCHA_SECRET) {
      console.error('CAPTCHA_SECRET environment variable is not set');
      return res.status(500).json(createResponse(false, 'reCAPTCHA verification configuration error'));
    }

    console.log('Verifying reCAPTCHA token with Google API...');
    
    // Verify the token with Google's reCAPTCHA API
    const verificationResponse = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      {
        params: {
          secret: process.env.CAPTCHA_SECRET,
          response: recaptchaToken
        }
      }
    );

    console.log('reCAPTCHA verification response:', JSON.stringify(verificationResponse.data));

    // Check if verification was successful
    if (!verificationResponse.data.success) {
      const errorCodes = verificationResponse.data['error-codes'] || [];
      return res.status(400).json(createResponse(
        false, 
        `reCAPTCHA verification failed: ${errorCodes.join(', ') || 'unknown error'}`
      ));
    }

    // Continue with the request
    next();
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    res.status(500).json(createResponse(false, `reCAPTCHA verification error: ${error.message}`));
  }
};

module.exports = verifyRecaptcha; 