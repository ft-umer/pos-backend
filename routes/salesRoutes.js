import express from "express";
import Sale from "../models/Sales.js";
import Product from "../models/Product.js";
import OrderTaker from "../models/OrderTaker.js";
import { authenticateJWT } from "../middleware/auth.js";

const router = express.Router();

// ========================
// POST /sales → Create Sale
// ========================
router.post("/", authenticateJWT, async (req, res) => {
  try {
    const { items, total, paymentMethod, orderType, orderTaker } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "No items in sale." });
    }

    // ✅ Update product stock
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

    // ✅ Create sale
    const sale = new Sale({
      items,
      total,
      paymentMethod,
      orderType,
      orderTaker,
      user: req.user._id,
    });

    await sale.save();

    res.status(201).json(sale);
  } catch (err) {
    console.error("❌ Error creating sale:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ========================
// GET /sales → Fetch all sales (with product details)
// ========================
// ========================
// GET /sales → Fetch sales (admin sees own, superadmin sees all)
// ========================
router.get("/", authenticateJWT, async (req, res) => {
  try {
    let query = {};

    // ✅ Admin → only own sales
    if (req.user.role !== "superadmin") {
      query.user = req.user._id;
    }

    const sales = await Sale.find(query)
      .sort({ createdAt: -1 })
      .populate("user", "username email role")
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
router.put("/:id", authenticateJWT, async (req, res) => {
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

router.delete("/range", authenticateJWT, async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ message: "From and To dates required" });
    }

    const result = await Sale.deleteMany({
      createdAt: {
        $gte: new Date(from),
        $lte: new Date(`${to}T23:59:59.999`),
      },
    });

    res.json({
      message: "Sales deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


// ========================
// DELETE /sales/:id → Delete Sale
// ========================
router.delete("/:id", authenticateJWT, async (req, res) => {
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



// GET /sales/admin-tabs
router.get("/admin-tabs", authenticateJWT, async (req, res) => {
  try {
    // 🔒 Only SUPERADMIN
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Superadmin only" });
    }

    const sales = await Sale.find()
      .populate("user", "username email role")
      .populate("items.productId", "name fullPrice halfPrice imageUrl")
      .sort({ createdAt: -1 });

    const grouped = {};

    for (const sale of sales) {
      if (!sale.user) continue; // skip sales with no user

      // ✅ Include admins AND superadmins
      if (sale.user.role !== "admin" && sale.user.role !== "superadmin")
        continue;

      const adminId = sale.user._id.toString();

      if (!grouped[adminId]) {
        grouped[adminId] = {
          adminId,
          adminName: sale.user.username,
          sales: [],
        };
      }

      grouped[adminId].sales.push(sale);
    }

    res.status(200).json(Object.values(grouped));
  } catch (err) {
    console.error("Admin tabs error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
