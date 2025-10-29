import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import productRoutes from "./routes/productRoutes.js";
import salesRoutes from "./routes/salesRoutes.js";
import orderTakerRoutes from "./routes/orderTakerRoutes.js";
import activityRoutes from "./routes/activityRoutes.js"
import { v2 as cloudinary } from "cloudinary";
import User from "./models/User.js";
import Activity from "./models/Activity.js";

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// =======================
// MongoDB Connection
// =======================
mongoose
  .connect(process.env.MONGODB_URI || "mongodb+srv://syedumerhassni:naibtana123@cluster0.8kun6ji.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ Connected to MongoDB");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// =======================
// Middleware
// =======================
const authenticateJWT = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Missing token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get full Mongoose document, not plain object
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: "User not found" });

    req.user = user; // ✅ this must be a full model instance
    next();
  } catch (err) {
    console.error("JWT auth error:", err);
    return res.status(401).json({ message: "Invalid token" });
  }
};

export const authorizeSuperadmin = (req, res, next) => {
  if (req.user.role !== "superadmin") {
    return res.status(403).json({ message: "Forbidden: Superadmin only" });
  }
  next();
};

// =======================
// Create default superadmin
// =======================
const createDefaultSuperadmin = async () => {
  try {
    const existing = await User.findOne({ role: "superadmin" });
    if (!existing) {
      const hashedPassword = await bcrypt.hash("123456", 10);
      const superadmin = new User({
        username: "superadmin",
        role: "superadmin",
        password: hashedPassword,
      });
      await superadmin.save();
      console.log("✅ Default superadmin created");
    }
  } catch (err) {
    console.error("Error creating default superadmin:", err);
  }
};
createDefaultSuperadmin();

// =======================
// Routes
// =======================

// Login
app.post("/login", async (req, res) => {
  try {
    const { username, password, pin } = req.body;
    if (!username || !password)
      return res
        .status(400)
        .json({ message: "Username and password required" });

    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    if (user.role === "admin" && user.pin !== pin)
      return res.status(401).json({ message: "Invalid PIN" });

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "8h",
    });
    res.json({ message: "Login successful", token, user });
  } catch (err) {
    console.error("Login error:", err);
    res
      .status(500)
      .json({ message: "Server error during login", error: err.message });
  }
});

app.post("/logout", authenticateJWT, async (req, res) => {
  try {
    const user = req.user; // ✅ Already a Mongoose document
    if (!user) return res.status(404).json({ message: "User not found" });

    user.lastLogout = new Date();
    await user.save();

    res.json({ message: "Logout successful" });
  } catch (err) {
    console.error("Logout error:", err);
    res
      .status(500)
      .json({ message: "Server error during logout", error: err.message });
  }
});

// Get all users (superadmin only)
app.get("/users", authenticateJWT, authorizeSuperadmin, async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    console.error("Fetch users error:", err);
    res
      .status(500)
      .json({ message: "Server error fetching users", error: err.message });
  }
});

app.post("/users", authenticateJWT, authorizeSuperadmin, async (req, res) => {
  try {
    const { username, pin, site } = req.body;
    const hashedPassword = await bcrypt.hash("123456", 10);
    const newAdmin = new User({
      username,
      role: "admin",
      password: hashedPassword,
      pin,
      site,
    });
    await newAdmin.save();
    res.json({ message: "Admin added successfully", user: newAdmin });
  } catch (err) {
    console.error("Add admin error:", err);
    res.status(500).json({
      message: "Server error while adding admin",
      error: err.message,
    });
  }
});

// =======================
// Fetch all activity logs (superadmin only)
// =======================
app.get("/activity", authenticateJWT, async (req, res) => {
  try {
    // 🟢 Only superadmin can view activity logs
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Forbidden: Superadmin only" });
    }

    const logs = await Activity.find().sort({ timestamp: -1 }).limit(100);
    res.status(200).json(logs);
  } catch (err) {
    console.error("Fetch activity error:", err);
    res.status(500).json({ message: "Failed to fetch activity logs" });
  }
});



app.delete("/users/:id", authenticateJWT, authorizeSuperadmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prevent superadmin from deleting themselves
    if (req.user.id === id) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }

    await User.findByIdAndDelete(id);

    res.json({ message: "Admin deleted successfully" });
  } catch (err) {
    console.error("Delete admin error:", err);
    res.status(500).json({
      message: "Server error while deleting admin",
      error: err.message,
    });
  }
});


app.use("/products", productRoutes);
app.use("/orderTakers", orderTakerRoutes);
app.use("/sales", salesRoutes);
app.use("/activity", activityRoutes)

// 👉 Export default for Vercel
export default app;
