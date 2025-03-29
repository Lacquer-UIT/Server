const express = require("express");
const { translateToVietnamese } = require("../huggingface/transformer");
const response = require("../dto");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const query = req.query.englishText;
    if (!query) {
      return res.status(400).json(response(false, "Missing 'englishText' parameter"));
    }

    console.log(`Received request: ${query}`);

    let vietnameseText = "";

    // Check if text is longer than 100 characters
    if (query.length > 100) {
      // Split by sentences (using period followed by space as separator)
      const sentences = query.split(/\.\s+/);

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
      vietnameseText = await translateToVietnamese(query);
    }

    console.log(`Translation success: ${vietnameseText}`);
    res.json(response(true, "Translation successful", vietnameseText));
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json(response(false, "Translation failed"));
  }
});

module.exports = router;