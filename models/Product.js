import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    stock: { type: Number, required: true },
    barcode: { type: String },
    plateType: { type: String },
    imageUrl: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("Product", productSchema);
