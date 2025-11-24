import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    fullPrice: { type: Number, required: true },
    halfPrice: { type: Number },
    fullStock: { type: Number, required: true },
    halfStock: { type: Number },
    familyPack:{ type:Number },
    familyStock:{ type:Number },
    totalStock: { type: Number },
    barcode: { type: String },
    category: { type: String },
    imageUrl: { type: String },
    isSolo: { type: Boolean, default: false },

    // ✅ Add this line ↓
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// ✅ Automatically calculate totalStock if not provided
productSchema.pre("save", function (next) {
  if (!this.isSolo) {
    this.totalStock = this.fullStock + this.halfStock;
  } else {
    this.totalStock = this.fullStock;
  }
  next();
});

export default mongoose.model("Product", productSchema);
