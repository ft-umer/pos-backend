import express from "express";
import Product from "../models/Product.js";
import ProductOrder from "../models/ProductOrder.js";
import { authenticateJWT } from "../middleware/auth.js";

const router = express.Router();

// ✅ Get all products in saved order (if exists)
router.get("/", authenticateJWT, async (req, res) => {
  try {
    const orderDoc = await ProductOrder.findOne();
    const allProducts = await Product.find();

    let sortedProducts = allProducts;

    if (orderDoc) {
      // sort by saved order
      sortedProducts = orderDoc.productIds
        .map(id => allProducts.find(p => p._id.toString() === id.toString()))
        .filter(Boolean); // remove deleted products

      // include new products not in saved order at the end
      const newOnes = allProducts.filter(
        p => !orderDoc.productIds.includes(p._id)
      );
      sortedProducts = [...sortedProducts, ...newOnes];
    }

    res.status(200).json(sortedProducts);
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/reorder", authenticateJWT, async (req, res) => {
  try {
    const { order } = req.body;

    if (!order || !Array.isArray(order)) {
      return res.status(400).json({ message: "Invalid order data" });
    }

    console.log("reorder route hit!", { order });

    // Update each product’s sortOrder
    const updatePromises = order.map((id, index) =>
      Product.findByIdAndUpdate(
        id,
        { $set: { sortOrder: index } },
        { new: true } // returns updated doc
      )
    );

    const updatedProducts = await Promise.all(updatePromises);
    console.log("✅ Saved order to DB:", updatedProducts.map(p => ({ id: p._id, sortOrder: p.sortOrder })));

    res.status(200).json({ message: "Product order updated in DB", updatedProducts });
  } catch (err) {
    console.error("❌ Error saving order:", err);
    res.status(500).json({ message: "Server error" });
  }
});


export default router;
