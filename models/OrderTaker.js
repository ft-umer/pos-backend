import mongoose from "mongoose";

const orderTakerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String },
  balance: { type: Number, default: 0 },
  imageUrl: { type: String },
}, { timestamps: true });

export default mongoose.model("OrderTaker", orderTakerSchema);
