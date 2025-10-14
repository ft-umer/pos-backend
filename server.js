import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import productRoutes from "./routes/productRoutes.js";
import salesRoutes from "./routes/salesRoutes.js";
import { v2 as cloudinary } from "cloudinary";


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
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

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

const User = mongoose.model("User", userSchema);

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


app.use("/products", productRoutes);

app.use("/sales", salesRoutes);

// =======================
// Start server
// =======================
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
