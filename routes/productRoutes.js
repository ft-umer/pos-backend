import express from "express";
import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import Product from "../models/Product.js";
import { logActivity } from "../middleware/logActivity.js";
import { authenticateJWT } from "../middleware/auth.js";

const router = express.Router();

// Multer setup (memory storage for Cloudinary)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// =================== CREATE PRODUCT ===================
router.post("/", authenticateJWT, upload.single("image"), async (req, res) => {
  try {
    const { 
      name, fullPrice, halfPrice, fullStock, halfStock, 
      familyPack, familyStock, category, barcode, isSolo 
    } = req.body;

    // Upload image to Cloudinary
    let imageUrl = "";
    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "pos_products" }, 
          (err, result) => err ? reject(err) : resolve(result)
        );
        uploadStream.end(req.file.buffer);
      });
      imageUrl = result.secure_url;
    }

    // Create product with numeric casting
    const product = await Product.create({
      name,
      fullPrice: Number(fullPrice),
      halfPrice: Number(halfPrice),
      fullStock: Number(fullStock),
      halfStock: Number(halfStock),
      familyPack: Number(familyPack),
      familyStock: Number(familyStock),
      category,
      barcode,
      imageUrl,
      isSolo: isSolo === "true" || isSolo === true
    });

    await logActivity(req.user, `Created product: ${product.name}`);
    res.status(201).json(product);

  } catch (err) {
    console.error("❌ Product upload error:", err);
    res.status(500).json({ message: "Error uploading product", error: err.message });
  }
});

// =================== UPDATE PRODUCT ===================
router.put("/:id", authenticateJWT, upload.single("image"), async (req, res) => {
  try {
    const { 
      name, fullPrice, halfPrice, fullStock, halfStock, 
      familyPack, familyStock, category, barcode, isSolo 
    } = req.body;

    // Prepare update data with numeric casting
    const updateData = {
      name,
      fullPrice: Number(fullPrice),
      halfPrice: Number(halfPrice),
      fullStock: Number(fullStock),
      halfStock: Number(halfStock),
      familyPack: Number(familyPack),
      familyStock: Number(familyStock),
      category,
      barcode,
      isSolo: isSolo === "true" || isSolo === true
    };

    // Upload new image if provided
    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "pos_products" },
          (err, result) => err ? reject(err) : resolve(result)
        );
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

// =================== GET PRODUCTS ===================
router.get("/", authenticateJWT, async (req, res) => {
  try {
    const products = await Product.find().sort({ sortOrder: 1 });
    res.status(200).json(products);
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// =================== DELETE PRODUCT ===================
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
