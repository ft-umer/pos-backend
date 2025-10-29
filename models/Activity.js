import mongoose from "mongoose";

const activitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  username: { type: String, required: true },
  action: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.model("Activity", activitySchema);
