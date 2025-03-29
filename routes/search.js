const express = require("express");
const Dictionary = require("../models/wordModel"); 
const response = require("../dto");

const router = express.Router();

router.get("/", async (req, res) => {
    try {
      const query = req.query.word;
      if (!query) {
        return res.status(400).json(response(false, "Missing 'word' query parameter"));
      }
  
      console.log(`Searching for: ${query}`);
  
      console.log("Executing Query:", { word: { $regex: `^${query}$`, $options: "i" } });
  
      const entry = await Dictionary.findOne({ word: { $regex: `^${query}$`, $options: "i" } });
  
      console.log("Found:", entry);
  
      if (!entry) {
        return res.status(404).json(response(false, "Word not found" ));
      }
  
      res.json(response(true, "query successfully", entry));
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json(response(false, error.message));
    }
  });

router.get("/suggest", async(req,res) =>{
  try{
    const query = req.query.q;
    if (!query) return res.status(200).json(response(true, "no query yet", [])) // Return empty if no query
    const suggestions = await Dictionary.find({ word: new RegExp("^" + query, "i") }) // Case-insensitive prefix match
    .limit(5);
    res.json(response(true, "Suggestions retrieved", suggestions.map((w) => w.word)));
  } catch (error) {
    res.status(500).json(response(false, error.message));
  }
});

module.exports = router;