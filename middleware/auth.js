import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const authenticateJWT = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Missing token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id); // Full document
    if (!user) return res.status(401).json({ message: "User not found" });

    req.user = user; // ✅ Important
    next();
  } catch (err) {
    console.error("JWT auth error:", err);
    return res.status(401).json({ message: "Invalid token" });
  }
};
