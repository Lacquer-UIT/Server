const express = require("express");
const Dictionary = require("../models/wordModel"); // English dictionary model
const DictionaryVn = require("../models/wordModelvn"); // Vietnamese dictionary model
const response = require("../dto");

const router = express.Router();

// List of valid languages
const validLanguages = ["en", "vn"];

// Search route: handles word lookup, suggestions, and search
router.get("/:lang", async (req, res) => {
  const { lang } = req.params;
  const { word, prefix, query } = req.query;

  // Validate language
  if (!validLanguages.includes(lang)) {
    return res.status(400).json(response(false, "Invalid language"));
  }

  // Ensure exactly one search parameter is provided
  const searchTypes = [word, prefix, query].filter(Boolean);
  if (searchTypes.length !== 1) {
    return res.status(400).json(response(false, "Provide exactly one of 'word', 'prefix', or 'query'"));
  }

  try {
    // Select model based on language
    const Model = lang === "en" ? Dictionary : DictionaryVn;

    if (word) {
      // Exact word match
      const entry = await Model.findOne({ word: { $regex: `^${word}$`, $options: "i" } });
      if (!entry) {
        return res.status(404).json(response(false, "Word not found"));
      }
      return res.json(response(true, "Word found", entry));
    } else if (prefix) {
      // Suggestions based on prefix
      const suggestions = await Model.find({ word: new RegExp("^" + prefix, "i") })
        .limit(5)
        .select("word");
      return res.json(response(true, "Suggestions retrieved", suggestions.map((w) => w.word)));
    } else if (query) {
      // Search in word or definition
      const results = await Model.find({
        $or: [
          { word: { $regex: query, $options: "i" } },
          { definition: { $regex: query, $options: "i" } },
        ],
      }).limit(10);
      if (results.length === 0) {
        return res.status(404).json(response(false, "No results found"));
      }
      return res.json(response(true, "Search successful", results));
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json(response(false, error.message));
  }
});

module.exports = router;