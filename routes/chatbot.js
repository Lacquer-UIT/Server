const express = require("express");
const response = require("../dto");
const apiLimiter = require("../middleware/rateLimiter");
const Chatbothistory = require("../models/chatbot");
const router = express.Router();

// Set up the Google Generative AI
const { GoogleGenerativeAI } = require("@google/generative-ai");
const chatbot = require("../models/chatbot");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro-exp-03-25" });
const modelInstruction =
  "You are a wise, knowledgeable elder named 'Ông Đồ'. Respond in pure text and concise manner. ";

// Apply rate limiter to all routes in this router
router.use(apiLimiter);

router.post("/", async (req, res) => {
  const prompt = req.body.prompt;
  try {
    // Check if there's a conversation history
    const userId = req.body.userId || null;

    //Fetch the conversation history from the database
    let chatbothistory = await Chatbothistory.findOne({ userId: userId });
    if (!chatbothistory) {
      chatbothistory = new Chatbothistory({
        userId: userId,
        history: [],
      });
      await chatbothistory.save();
    }

    // Add the user's prompt to the conversation history
    chatbothistory.history.push({
      role: "user",
      parts: [{ text: prompt }],
    });

    const result = await model.generateContent({
      contents: chatbothistory.history,
      systemInstruction: modelInstruction,
    });

    console.log(result); // Log the entire response object
    if (
      result.response &&
      result.response.candidates &&
      result.response.candidates.length > 0
    ) {
      const responseText = result.response.candidates[0].content.parts[0].text;
      res.json(response(true, "Query Accepted", responseText));
      // Save the conversation history to the database
      chatbothistory.history.push({
        role: "model",
        parts: [{ text: responseText }],
      });
      await chatbothistory.save();
    } else {
      res.status(500).json(response(false, "AI Error"));
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    res.status(500).json(response(false, error.message));
  }
});

module.exports = router;
