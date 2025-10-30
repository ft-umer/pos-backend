import mongoose from "mongoose";

const productOrderSchema = new mongoose.Schema(
  {
    productIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Product",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.ProductOrder ||
  mongoose.model("ProductOrder", productOrderSchema);
