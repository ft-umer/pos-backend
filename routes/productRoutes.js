import express from "express";
import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import Product from "../models/Product.js";
import { logActivity } from "../middleware/logActivity.js";
import { authenticateJWT } from "../middleware/auth.js";

const router = express.Router();

// ✅ Multer setup (memory storage for Cloudinary)
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/", authenticateJWT, upload.single("image"), async (req, res) => {
  try {
    const { name, fullPrice, halfPrice, fullStock, halfStock, category, barcode, isSolo } = req.body;

    let imageUrl = "";
    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream({ folder: "pos_products" }, (err, result) => {
          if (err) return reject(err);
          resolve(result);
        });
        uploadStream.end(req.file.buffer);
      });
      imageUrl = result.secure_url;
    }

    const product = await Product.create({
      name, fullPrice, halfPrice, fullStock, halfStock, category, barcode, imageUrl, isSolo: isSolo === "true" || isSolo === true
    });

    await logActivity(req.user, `Created product: ${product.name}`);
    res.status(201).json(product);
  } catch (err) {
    console.error("❌ Product upload error:", err);
    res.status(500).json({ message: "Error uploading product", error: err.message });
  }
});

router.put("/:id", authenticateJWT, upload.single("image"), async (req, res) => {
  try {
    const { name, fullPrice, halfPrice, fullStock, halfStock, category, barcode, isSolo } = req.body;

    const updateData = { name, fullPrice, halfPrice, fullStock, halfStock, category, barcode, isSolo: isSolo === "true" || isSolo === true };

    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({ folder: "pos_products" }, (err, result) => {
          if (err) return reject(err);
          resolve(result);
        });
        stream.end(req.file.buffer);
      });
      updateData.imageUrl = result.secure_url;
    }

    const updated = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updated) return res.status(404).json({ message: "Product not found" });

    await logActivity(req.user, `Updated product: ${updated.name}`);
    res.json(updated);
  } catch (err) {
    console.error("❌ Error updating product:", err);
    res.status(500).json({ message: "Error updating product", error: err.message });
  }
});

router.get("/", authenticateJWT, async (req, res) => {
  try {
    const products = await Product.find().sort({ sortOrder: 1 });
    res.status(200).json(products);
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ message: "Server error" });
  }
});


router.delete("/:id", authenticateJWT, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    await logActivity(req.user, `Deleted product: ${product.name}`);
    res.json({ message: "✅ Product deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting product:", err);
    res.status(500).json({ message: "Error deleting product", error: err.message });
  }
});


export default router;
