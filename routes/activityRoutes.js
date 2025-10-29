// routes/activityRoutes.js
import express from "express";
import Activity from "../models/Activity.js";
import { authenticateJWT } from "../middleware/auth.js";

const router = express.Router();
// =======================
// Utility: Log activity (fixed)
// =======================
const logActivity = async (user, action) => {
  try {
    console.log("🟢 Logging activity for:", user.username, "-", action);
    await Activity.create({
      user: user._id,
      username: user.username,
      action,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error("❌ Activity log error:", err);
  }
};

// =======================
// Add a new order taker (superadmin only)
// =======================
router.post("/", authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Forbidden: Superadmin only" });
    }

    const { name, phone, balance, imageUrl } = req.body;
    const newTaker = new OrderTaker({ name, phone, balance, imageUrl });
    await newTaker.save();

    await logActivity(req.user, `Added order taker: ${name}`);

    res.status(201).json(newTaker);
  } catch (err) {
    console.error("Create order taker error:", err);
    res.status(500).json({ message: "Failed to create order taker" });
  }
});


export default router;
