import express from "express";
import OrderTaker from "../models/OrderTaker.js";
import { logActivity } from "../middleware/logActivity.js";
import { authenticateJWT } from "../middleware/auth.js";

const router = express.Router();

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

    // ✅ Log activity for superadmin
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

    if (req.user.role === "admin") {
  if (updateData.balance === undefined) {
    return res.status(403).json({ message: "Admins can only edit balance" });
  }

  // Convert to number just in case
  taker.balance = Number(updateData.balance);
  await taker.save();

  // Log admin activity
  await logActivity(req.user, `Admin updated balance for ${taker.name} to ${taker.balance}`);

  return res.status(200).json(taker);
}

    // Superadmin can update all fields
    const updated = await OrderTaker.findByIdAndUpdate(id, updateData, { new: true });

    // ✅ Log activity for superadmin
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
