const express = require("express");
const Dictionary = require("../models/wordModel");
const response = require("../dto");

const router = express.Router();

// get 1 random word in dictionary
router.get("/", async (req, res) => {
  try {
    const query = req.query.difficulty;
    if (!query) {
      return res
        .status(400)
        .json(response(false, "missing 'difficulty' query"));
    } else {
      console.log(`difficulty: ${query}`);
      const entry = await Dictionary.aggregate([
        { $match: { difficulty: query } },
        { $sample: { size: 1 } },
      ]);
      res.status(200).json(response(true, "query successfully",entry));
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json(response(false, "Internal Server Error"));
  }
});

// get 4 random word in dictionary
router.get("/multi", async (req, res) => {
  try {
    const query = req.query.difficulty;
    if (!query) {
      return res
        .status(400)
        .json(request(false, "missing 'difficulty' query"));
    } else {
      console.log(`difficulty: ${query}`);
      const entry = await Dictionary.aggregate([
        { $match: { difficulty: query } },
        { $sample: { size: 4 } },
      ]);
      res.status(200).json(response(true, "query successfuly", entry));
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json(response(false, "Internal Server Error"));
  }
});

module.exports = router;
