import Activity from "../models/Activity.js";
 
 
export const logActivity = async (user, action) => {
  try {
    await Activity.create({
      user: user._id,          // ✅ store reference to the user
      username: user.username, // ✅ store readable name
      action,                  // ✅ store action message
      timestamp: new Date(),   // ✅ optional if schema sets default
    });
  } catch (err) {
    console.error("Activity log error:", err);
  }
};

