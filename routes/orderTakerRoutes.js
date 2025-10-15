import express from "express";
import OrderTaker from "../models/OrderTaker.js"; // Mongoose model

const router = express.Router();

// Get all order takers
router.get("/", async (req, res) => {
  try {
    const takers = await OrderTaker.find();
    res.status(200).json(takers);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch order takers" });
  }
});

// Add a new order taker
router.post("/", async (req, res) => {
  try {
    const { name, phone, balance, imageUrl } = req.body;
    const newTaker = new OrderTaker({ name, phone, balance, imageUrl });
    await newTaker.save();
    res.status(201).json(newTaker);
  } catch (err) {
    res.status(500).json({ message: "Failed to create order taker" });
  }
});

// Update order taker
router.put("/:id", async (req, res) => {
  try {
    const updated = await OrderTaker.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ message: "Failed to update order taker" });
  }
});

// Delete order taker
router.delete("/:id", async (req, res) => {
  try {
    await OrderTaker.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete order taker" });
  }
});

export default router;
