// routes/activityRoutes.js
import express from "express";
import { logActivity } from "../utils/activity.js";
import { authenticateJWT } from "../middleware/auth.js";

const router = express.Router();

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
