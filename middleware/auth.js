const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;
const response = require("../dto");

const authMiddleware = (req, res, next) => {
  // Get the Authorization header
  const authHeader = req.header("authorization");

  // Check if the header exists
  if (!authHeader) {
    return res.status(401).json(response(false, "Access Denied, No Token provided"));
  }

  // Extract the token by splitting on the space and taking the second part
  const token = authHeader.split(" ")[1];
  console.log("🔹 Extracted token:", token);

  // Verify the token exists and is not empty
  if (!token) {
    return res.status(401).json(response(false, "Invalid Token"));
  }

  try {
    // Verify the token with the secret
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Attach user data to request
    next();
  } catch (error) {
    return res.status(400).json(response(false, "Invalid Token"));
  }
};

module.exports = authMiddleware;