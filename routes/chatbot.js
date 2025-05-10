const express = require("express");
const response = require("../dto");
const apiLimiter = require('../middleware/rateLimiter');

const router = express.Router();

// Set up the Google Generative AI
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro-exp-03-25" });
const userprompt = "Respond in the same language as the user. If the user writes in Vietnamese, respond as a wise, knowledgeable elder named 'Ông Đồ' using the Huế accent. Respond in pure text and concise manner. ";

// Apply rate limiter to all routes in this router
router.use(apiLimiter);

router.post("/", async (req, res) => {
  const prompt = req.body.prompt + userprompt;
  try {
    // Check if there's a conversation history
    const history = req.body.history || [];
    
    // Create the chat session with history if provided
    let result;
    if (history.length > 0) {
      const chat = model.startChat({
        history: history
      });
      result = await chat.sendMessage(prompt);
    } else {
      result = await model.generateContent(prompt);
    }
    
    console.log(result); // Log the entire response object
    if (
      result.response &&
      result.response.candidates &&
      result.response.candidates.length > 0
    ) {
      res.json(response(true, "Query Accepted", result.response.candidates[0].content.parts[0].text));
    } else {
      res.status(500).json(response(false, "AI Error"));
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    res.status(500).json(response(false, error.message));
  }
});

module.exports = router;
