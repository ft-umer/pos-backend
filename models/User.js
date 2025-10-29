import mongoose from "mongoose";


// =======================
// User Schema
// =======================
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  role: { type: String, enum: ["superadmin", "admin"], required: true },
  site: { type: String },
  pin: { type: String },
  password: { type: String, required: true },
  lastLogin: { type: Date },
  lastLogout: { type: Date },
});

export default mongoose.model("User", userSchema);