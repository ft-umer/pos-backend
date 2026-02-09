import mongoose from "mongoose";

const SaleSchema = new mongoose.Schema(
  {
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
      },
    ],
    total: { type: Number, required: true },
    paymentMethod: { type: String, required: true },
    orderType: { type: String, required: true },
    orderTaker: { type: String, required: true },
    // ✅ logged-in user
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },

  { timestamps: true },
);

export default mongoose.model("Sale", SaleSchema);
