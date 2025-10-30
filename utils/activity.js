// utils/logActivity.js
import Activity from "../models/Activity.js";

export const logActivity = async (user, action) => {
  try {
    console.log("🟢 Logging activity for:", user.username, "-", action);
    await Activity.create({
      user: user._id,
      username: user.username,
      role: user.role, // save role too
      action,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error("❌ Activity log error:", err);
  }
};
