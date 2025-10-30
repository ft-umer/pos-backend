import express from "express";
import OrderTaker from "../models/OrderTaker.js";
import Activity from "../models/Activity.js";
import { authenticateJWT } from "../middleware/auth.js";

const router = express.Router();

/* ============================================================
   Utility: Log activity
============================================================ */
const logActivity = async (user, action) => {
  try {
    if (!user || !user.username) {
      console.warn("⚠️ Skipping activity log — invalid user:", user);
      return;
    }

    console.log("🟢 Logging activity for:", user.username, "-", action);

    const created = await Activity.create({
      user: user._id,
      username: user.username,
      action,
      timestamp: new Date(),
    });

    console.log("✅ Activity saved:", created);
  } catch (err) {
    console.error("❌ Activity log error:", err);
  }
};

/* ============================================================
   Get all order takers
============================================================ */
router.get("/", async (req, res) => {
  try {
    const takers = await OrderTaker.find();
    res.status(200).json(takers);
  } catch (err) {
    console.error("Get order takers error:", err);
    res.status(500).json({ message: "Failed to fetch order takers" });
  }
});

/* ============================================================
   Add a new order taker (superadmin only)
============================================================ */
router.post("/", authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Forbidden: Superadmin only" });
    }

    const { name, phone, balance, imageUrl } = req.body;
    const newTaker = new OrderTaker({ name, phone, balance, imageUrl });
    await newTaker.save();

    // Log activity
    await logActivity(req.user, `Added order taker: ${name}`);

    res.status(201).json(newTaker);
  } catch (err) {
    console.error("Create order taker error:", err);
    res.status(500).json({ message: "Failed to create order taker" });
  }
});

/* ============================================================
   Update order taker
   - Admin → can only update balance
   - Superadmin → can update everything
============================================================ */
router.put("/:id", authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const taker = await OrderTaker.findById(id);
    if (!taker) return res.status(404).json({ message: "Order taker not found" });

    // 🟡 Admins can only update balance
    if (req.user.role === "admin") {
      if (Object.keys(updateData).length !== 1 || updateData.balance === undefined) {
        return res.status(403).json({ message: "Admins can only edit balance" });
      }

      taker.balance = updateData.balance;
      await taker.save();

      await logActivity(req.user, `Updated balance for ${taker.name} to ${updateData.balance}`);
      return res.status(200).json(taker);
    }

    // 🟢 Superadmin can update everything
    const updated = await OrderTaker.findByIdAndUpdate(id, updateData, { new: true });
    await logActivity(req.user, `Updated order taker: ${updated.name}`);

    res.status(200).json(updated);
  } catch (err) {
    console.error("Update order taker error:", err);
    res.status(500).json({ message: "Failed to update order taker" });
  }
});

/* ============================================================
   Delete order taker (superadmin only)
============================================================ */
router.delete("/:id", authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Forbidden: Superadmin only" });
    }

    const deleted = await OrderTaker.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Order taker not found" });

    await logActivity(req.user, `Deleted order taker: ${deleted.name}`);
    res.status(200).json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("Delete order taker error:", err);
    
    res.status(500).json({ message: "Failed to delete order taker" });
  }
});

export default router;
