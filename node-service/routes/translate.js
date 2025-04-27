const express = require("express");
const { translateToVietnamese } = require("../huggingface/transformer");
const response = require("../dto");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { englishText } = req.body;
    if (!englishText) {
      return res.status(400).json(response(false, "Missing 'englishText' in request body"));
    }

    console.log(`Received request: ${englishText}`);

    let vietnameseText = "";

    // Check if text is longer than 100 characters
    if (englishText.length > 100) {
      // Split by sentences (using period followed by space as separator)
      const sentences = englishText.split(/\.\s+/);

      // Translate each sentence separately and join
      const translations = await Promise.all(
        sentences.map(async (sentence) => {
          // Add back the period if it's not the last empty segment
          const sentenceToTranslate = sentence.trim();
          if (!sentenceToTranslate) return "";

          return await translateToVietnamese(sentenceToTranslate);
        })
      );

      vietnameseText = translations.join(". ");
    } else {
      vietnameseText = await translateToVietnamese(englishText);
    }

    console.log(`Translation success: ${vietnameseText}`);
    res.json(response(true, "Translation successful", vietnameseText));
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json(response(false, "Translation failed"));
  }
});

module.exports = router;