import express from "express";
import Sale from "../models/Sales.js";
import Product from "../models/Product.js";

const router = express.Router();

// ========================
// POST /sales → Create Sale
// ========================
router.post("/", async (req, res) => {
  try {
    const { items, total, paymentMethod, orderType, orderTaker } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "No items in sale." });
    }

    // ✅ Update product stock
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ message: `Product not found: ${item.productId}` });
      }

      if (item.plateType === "Full Plate") {
        if (product.fullStock < item.quantity) {
          return res.status(400).json({ message: `Insufficient full stock for ${product.name}` });
        }
        product.fullStock -= item.quantity;
      } 
      else if (item.plateType === "Half Plate") {
        if (product.halfStock < item.quantity) {
          return res.status(400).json({ message: `Insufficient half stock for ${product.name}` });
        }
        product.halfStock -= item.quantity;
      }

      product.totalStock = (product.fullStock || 0) + (product.halfStock || 0);
      await product.save();
    }

    // ✅ Create sale
    const sale = new Sale({
      items,
      total,
      paymentMethod,
      orderType,
      orderTaker,
    });

    await sale.save();

    // 🔥 Update order taker balance in DB
    if (orderTaker && orderTaker !== "Open Sale") {
      const taker = await OrderTaker.findOne({ name: orderTaker });

      if (taker) {
        taker.balance = (taker.balance || 0) - total;
        await taker.save();
      }
    }

    res.status(201).json(sale);
  } catch (err) {
    console.error("❌ Error creating sale:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


// ========================
// GET /sales → Fetch all sales (with product details)
// ========================
router.get("/", async (req, res) => {
  try {
    const sales = await Sale.find()
      .sort({ createdAt: -1 })
      .populate("items.productId", "name fullPrice halfPrice imageUrl");

    res.status(200).json(sales);
  } catch (err) {
    console.error("❌ Error fetching sales:", err);
    res.status(500).json({ message: err.message });
  }
});

// ========================
// PUT /sales/:id → Edit Sale
// ========================
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { items, total, paymentMethod, orderType, orderTaker } = req.body;

    const existingSale = await Sale.findById(id);
    if (!existingSale) {
      return res.status(404).json({ message: "Sale not found" });
    }

    // ✅ Restore previous stock
    for (const item of existingSale.items) {
      const product = await Product.findById(item.productId);
      if (product) {
        if (item.plateType === "Full Plate") {
          product.fullStock += item.quantity;
        } else if (item.plateType === "Half Plate") {
          product.halfStock += item.quantity;
        }
        product.totalStock =
          (product.fullStock || 0) + (product.halfStock || 0);
        await product.save();
      }
    }

    // ✅ Deduct stock for new sale
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res
          .status(404)
          .json({ message: `Product not found: ${item.productId}` });
      }

      if (item.plateType === "Full Plate") {
        if (product.fullStock < item.quantity) {
          return res
            .status(400)
            .json({ message: `Insufficient full stock for ${product.name}` });
        }
        product.fullStock -= item.quantity;
      } else if (item.plateType === "Half Plate") {
        if (product.halfStock < item.quantity) {
          return res
            .status(400)
            .json({ message: `Insufficient half stock for ${product.name}` });
        }
        product.halfStock -= item.quantity;
      }

      product.totalStock = (product.fullStock || 0) + (product.halfStock || 0);
      await product.save();
    }

    // ✅ Update sale record
    existingSale.items = items;
    existingSale.total = total;
    existingSale.paymentMethod = paymentMethod;
    existingSale.orderType = orderType;
    existingSale.orderTaker = orderTaker;

    await existingSale.save();
    res.status(200).json(existingSale);
  } catch (err) {
    console.error("❌ Error updating sale:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ========================
// DELETE /sales → Delete All Sales
// ========================
router.delete("/all", async (req, res) => {
  try {
    const allSales = await Sale.find();
    if (!allSales.length) {
      return res.status(404).json({ message: "No sales found to delete." });
    }

    // ✅ Restore stock for all sold products
    for (const sale of allSales) {
      for (const item of sale.items) {
        const product = await Product.findById(item.productId);
        if (product) {
          if (item.plateType === "Full Plate") {
            product.fullStock += item.quantity;
          } else if (item.plateType === "Half Plate") {
            product.halfStock += item.quantity;
          }
          product.totalStock =
            (product.fullStock || 0) + (product.halfStock || 0);
          await product.save();
        }
      }
    }

    // ✅ Delete all sales
    await Sale.deleteMany({});
    res
      .status(200)
      .json({ message: "All sales deleted successfully and stock restored." });
  } catch (err) {
    console.error("❌ Error deleting all sales:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ========================
// DELETE /sales/:id → Delete Sale
// ========================
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const sale = await Sale.findById(id);
    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }

    // ✅ Restore stock for each sold item
    for (const item of sale.items) {
      const product = await Product.findById(item.productId);
      if (product) {
        if (item.plateType === "Full Plate") {
          product.fullStock += item.quantity;
        } else if (item.plateType === "Half Plate") {
          product.halfStock += item.quantity;
        }
        product.totalStock =
          (product.fullStock || 0) + (product.halfStock || 0);
        await product.save();
      }
    }

    await sale.deleteOne();
    res.status(200).json({ message: "Sale deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting sale:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

export default router;
