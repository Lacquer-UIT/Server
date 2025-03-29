const express = require("express");
const Dictionary = require("../models/wordModel"); 

const router = express.Router();

router.get("/", async (req, res) => {
    try {
      const query = req.query.word;
      if (!query) {
        return res.status(400).json({ error: "Missing 'word' query parameter" });
      }
  
      console.log(`Searching for: ${query}`);
  
      console.log("Executing Query:", { word: { $regex: `^${query}$`, $options: "i" } });
  
      const entry = await Dictionary.findOne({ word: { $regex: `^${query}$`, $options: "i" } });
  
      console.log("Found:", entry);
  
      if (!entry) {
        return res.status(404).json({ error: "Word not found" });
      }
  
      res.json(entry);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

router.get("/suggest", async(req,res) =>{
  try{
    const query = req.query.q;
    if (!query) return res.json([]); // Return empty if no query
    const suggestions = await Dictionary.find({ word: new RegExp("^" + query, "i") }) // Case-insensitive prefix match
    .limit(5);
    res.json(suggestions.map((w) => w.word));
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;