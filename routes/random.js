const express = require("express");
const Dictionary = require("../models/wordModel"); 

const router = express.Router();

router.get("/", async (req, res) => {
    try{
        const query = req.query.difficulty;
        if (!query) {
            return res.status(400).json({ error: "Missing 'difficulty' query parameter" });
        }
        else{
            const entry = Dictionary.aggregate([
                { $match: { difficulty: query} },
                { $sample: { size: 1 } }
            ])
            res.json(entry)
        }

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;