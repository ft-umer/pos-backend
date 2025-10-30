// middleware/logActivity.js
import Activity from "../models/Activity.js";

export const logActivity = async (user, action) => {
  try {
    await Activity.create({
      user: user._id,
      username: user.username,
      role: user.role,
      action,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error("Activity log error:", err);
  }
};
