import express from "express";
import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import Product from "../models/Product.js";
import fs from "fs";

const router = express.Router();

// Multer setup — store temporarily
const upload = multer({ dest: "uploads/" });

// === Create Product ===
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { name, price, stock, barcode, plateType } = req.body;
    let imageUrl = "";
    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "banners" },
          (err, result) => {
            if (err) return reject(err);
            resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });
      imageUrl = result.secure_url;
    }
    const product = await Product.create({
      name,
      price,
      stock,
      barcode,
      plateType,
      imageUrl,
    });

    res.status(201).json(product);
  } catch (err) {
    console.error("Product upload error:", err);
    res.status(500).json({ message: "Error uploading product" });
  }
});

router.get("/", async (req, res) => {
  try {
    const sales = await Sale.find()
      .sort({ createdAt: -1 })
      .populate("items.productId", "name price imageUrl"); // populate product details

    res.status(200).json(sales);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// === Update Product ===
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const { name, price, stock, barcode, plateType } = req.body;
    const updateData = { name, price, stock, barcode, plateType };

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "pos_products",
      });
      updateData.imageUrl = result.secure_url;
      fs.unlinkSync(req.file.path);
    }

    const updated = await Product.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating product" });
  }
});

// === Delete Product ===
router.delete("/:id", async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting product" });
  }
});

export default router;
