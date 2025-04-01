const express = require("express");
const Dictionary = require("../models/wordModel"); // English dictionary model
const DictionaryVn = require("../models/wordModelvn"); // Vietnamese dictionary model
const response = require("../dto");
const router = express.Router();

// List of valid languages
const validLanguages = ["en", "vn"];

// Random route: handles random word retrieval
router.get("/:lang", async (req, res) => {
  const { lang } = req.params;
  const count = parseInt(req.query.count) || 1;
  const { difficulty } = req.query;

  // Validate language
  if (!validLanguages.includes(lang)) {
    return res.status(400).json(response(false, "Invalid language"));
  }

  // Validate count
  if (count <= 0) {
    return res.status(400).json(response(false, "Count must be a positive integer"));
  }

  try {
    let randomWords;
    if (lang === "en") {
      // English: filter by difficulty if provided
      const query = difficulty ? { difficulty } : {};
      randomWords = await Dictionary.aggregate([
        { $match: query },
        { $sample: { size: count } },
      ]);
    } else {
      // Vietnamese: no difficulty filter
      const query = difficulty ? { difficulty_level: difficulty } : {};
      randomWords = await DictionaryVn.aggregate([
        { $match: query },
        { $sample: { size: count } },
      ]);
    }

    if (randomWords.length === 0) {
      return res.status(404).json(response(false, "No words found"));
    }

    res.json(response(true, "Random words retrieved", randomWords));
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json(response(false, error.message));
  }
});

module.exports = router;