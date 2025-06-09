const express = require("express");
const response = require("../dto");
// const apiLimiter = require("../middleware/rateLimiter");
const Chatbothistory = require("../models/chatbot");
const router = express.Router();

const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const modelInstruction =
  "You are a wise, knowledgeable elder named 'Ông Đồ'. Respond in pure text and concise manner.";

// Helper to create safe Gemini-compatible message
function createMessage(role, text) {
  return {
    role,
    parts: [{ text }],
  };
}

// Helper to clean MongoDB history
function cleanHistory(history) {
  return history.map((msg) => ({
    role: msg.role,
    parts: msg.parts.map((part) => ({ text: part.text })),
  }));
}

// Apply rate limiter
// router.use(apiLimiter);

// POST /chatbot
router.post("/", async (req, res) => {
  const prompt = req.body.prompt;
  const userId = req.body.userId || null;

  try {
    // 1. Lấy hoặc tạo lịch sử hội thoại từ MongoDB
    let chatbothistory = await Chatbothistory.findOne({ userId });
    if (!chatbothistory) {
      chatbothistory = new Chatbothistory({ userId, history: [] });
    }

    // 2. Thêm tin nhắn người dùng mới (chưa lưu vào DB ngay)
    const userMessage = createMessage("user", prompt);
    const cleanHist = cleanHistory(chatbothistory.history);
    cleanHist.push(userMessage);

    // 3. Gọi Gemini API
    const result = await model.generateContent({
      contents: cleanHist,
      systemInstruction: modelInstruction,
    });

    // 4. Trích xuất kết quả trả lời
    const responseText =
      result?.response?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      return res.status(500).json(response(false, "AI Error"));
    }

    // 5. Trả dữ liệu về client
    res.json(response(true, "Query Accepted", responseText));

    // 6. Cập nhật và lưu lịch sử hội thoại vào DB
    chatbothistory.history.push(userMessage);
    chatbothistory.history.push(createMessage("model", responseText));
    await chatbothistory.save();
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    res.status(500).json(response(false, error.message));
  }
});

router.delete("/", async (req, res) => {
  const userId = req.query.userId;

  if (!userId) {
    return res.status(400).json(response(false, "Missing userId"));
  }

  try {
    const result = await Chatbothistory.findOneAndDelete({ userId });
    if (result) {
      res.json(response(true, "Conversation history deleted"));
    } else {
      res.status(404).json(response(false, "Conversation not found"));
    }
  } catch (error) {
    console.error("Error deleting chatbot history:", error);
    res.status(500).json(response(false, "Internal server error"));
  }
});

router.get("/", async (req, res) => {
  const userId = req.query.userId;

  if (!userId) {
    return res.status(400).json(response(false, "Missing userId"));
  }

  try {
    const chatbothistory = await Chatbothistory.findOne({ userId });

    if (!chatbothistory || chatbothistory.history.length === 0) {
      return res.status(404).json(response(false, "No conversation history found"));
    }

    res.json(response(true, "Conversation history fetched", chatbothistory.history));
  } catch (error) {
    console.error("Error fetching chatbot history:", error);
    res.status(500).json(response(false, "Internal server error"));
  }
});

module.exports = router;
