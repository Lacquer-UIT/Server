const express = require("express");
const Dictionary = require("../models/wordModel");

const router = express.Router();

// get 1 random word in dictionary
router.get("/", async (req, res) => {
  try {
    const query = req.query.difficulty;
    if (!query) {
      return res
        .status(400)
        .json({ error: "Missing 'difficulty' query parameter" });
    } else {
      console.log(`difficulty: ${query}`);
      const entry = await Dictionary.aggregate([
        { $match: { difficulty: query } },
        { $sample: { size: 1 } },
      ]);
      res.json(entry);
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// get 4 random word in dictionary
router.get("/multi", async (req, res) => {
  try {
    const query = req.query.difficulty;
    if (!query) {
      return res
        .status(400)
        .json({ error: "Missing 'difficulty' query parameter" });
    } else {
      console.log(`difficulty: ${query}`);
      const entry = await Dictionary.aggregate([
        { $match: { difficulty: query } },
        { $sample: { size: 4 } },
      ]);
      res.json(entry);
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
