const express = require("express");

const router = express.Router();

// Set up the Google Generative AI
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
const userprompt = "Respond in pure text and concise manner. ";

router.post("/", async (req, res) => {
  const prompt = req.body.prompt + userprompt;
  try {
    const result = await model.generateContent(prompt);
    console.log(result); // Log the entire response object
    if (
      result.response &&
      result.response.candidates &&
      result.response.candidates.length > 0
    ) {
      res.json({ result: result.response.candidates[0].content.parts[0].text });
    } else {
      res.status(500).json({ error: "No response from Gemini API" });
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    res.status(500).json({ error: "Internal server error " + error });
  }
});

module.exports = router;
