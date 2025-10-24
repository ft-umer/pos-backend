import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    fullPrice: { type: Number, required: true },
    halfPrice: { type: Number },
    
    // ✅ Separate stock for full and half plates
    fullStock: { type: Number, required: true },
    halfStock: { type: Number },

    // (Optional total stock if you still want a combined one)
    totalStock: { type: Number },

    barcode: { type: String },
    category: { type: String },
    imageUrl: { type: String },

    // ✅ Solo means only full plate is available
    isSolo: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ✅ Automatically calculate totalStock if not provided
productSchema.pre("save", function (next) {
  if (!this.isSolo) {
    this.totalStock = (this.fullStock) + (this.halfStock);
  } else {
    this.totalStock = this.fullStock;
  }
  next();
});

export default mongoose.model("Product", productSchema);
