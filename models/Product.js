import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    fullPrice: { type: Number, required: true },
    halfPrice: { type: Number, required: true },
    stock: { type: Number, required: true },
    barcode: { type: String },
    category: { type: String },
    imageUrl: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("Product", productSchema);
