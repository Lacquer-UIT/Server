const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

const authMiddleware = (req, res, next) => {
  // Get the Authorization header
  const authHeader = req.header("authorization");

  // Check if the header exists
  if (!authHeader) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  // Extract the token by splitting on the space and taking the second part
  const token = authHeader.split(" ")[1];
  console.log("🔹 Extracted token:", token);

  // Verify the token exists and is not empty
  if (!token) {
    return res.status(401).json({ message: "Access denied. Invalid token format." });
  }

  try {
    // Verify the token with the secret
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Attach user data to request
    next();
  } catch (error) {
    res.status(400).json({ message: "Invalid token" });
  }
};

module.exports = authMiddleware;